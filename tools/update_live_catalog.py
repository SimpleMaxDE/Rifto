#!/usr/bin/env python3
"""Build a local Wild Rift live catalog for champions, items, runes and summoner spells.

Output: data/live_catalog.json
The file keeps a lightweight diff versus the previous snapshot so the app can
highlight new content automatically across all tabs.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"
EQUIP_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/equip/equip.js"
RUNE_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/rune/rune.js"
SKILL_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/skill/skill.js"
OUT = Path("data/live_catalog.json")


def _num(text: str) -> float | None:
    m = re.search(r"(-?\d+(?:\.\d+)?)", str(text or ""))
    return float(m.group(1)) if m else None


def _extract_duration(text: str) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*秒", text or "")
    if m:
        return float(m.group(1))
    m = re.search(r"for\s+(\d+(?:\.\d+)?)\s*seconds?", text or "", re.I)
    return float(m.group(1)) if m else None


def parse_effect_blocks(desc: str | list[str]) -> tuple[list[dict], str | None]:
    text = "\n".join(desc) if isinstance(desc, list) else str(desc or "")
    chunks = [x.strip() for x in re.split(r"[\n。;；]+", text) if x.strip()]
    effects: list[dict] = []

    numeric_hits = 0
    for c in chunks:
        low = c.lower()
        trigger = "passive_always"
        if any(k in low for k in ["on hit", "普攻", "攻击命中", "命中"]):
            trigger = "onHit"
        elif any(k in low for k in ["施放", "cast", "技能命中", "spell"]):
            trigger = "onSpellHit"
        elif any(k in low for k in ["受到伤害", "damage taken", "承受"]):
            trigger = "onDamageTaken"
        elif any(k in low for k in ["击杀", "助攻", "takedown", "kill", "assist"]):
            trigger = "onTakedown"
        elif any(k in low for k in ["每", "every", "periodic"]):
            trigger = "periodic"

        kind = "modifier"
        damage_type = None
        if any(k in low for k in ["法术强度", "ap", "magic damage", "魔法伤害"]):
            kind = "damage" if "伤害" in c or "damage" in low else "stat"
            damage_type = "magic"
        if any(k in low for k in ["物理伤害", "physical damage"]):
            kind = "damage"
            damage_type = "physical"
        if any(k in low for k in ["真实伤害", "true damage"]):
            kind = "damage"
            damage_type = "true"
        if any(k in low for k in ["治疗", "heal", "回复生命"]):
            kind = "healing"
        if any(k in low for k in ["护盾", "shield"]):
            kind = "shield"
        if any(k in low for k in ["重伤", "grievous"]):
            kind = "anti_heal"
        if any(k in low for k in ["护甲穿透", "armor pen", "破甲"]):
            kind = "penetration"
        if any(k in low for k in ["法术穿透", "magic pen"]):
            kind = "penetration"
        if any(k in low for k in ["韧性", "tenacity"]):
            kind = "tenacity"
        if any(k in low for k in ["减速", "slow", "眩晕", "stun", "禁锢", "root"]):
            kind = "cc"

        values = re.findall(r"\d+(?:\.\d+)?%?", c)
        if values:
            numeric_hits += 1
        scaling: list[dict] = []
        if any(k in c for k in ["法强", "AP", "ap"]):
            scaling.append({"source": "ap", "ratio": _num(c)})
        if any(k in c for k in ["攻击力", "AD", "ad"]):
            scaling.append({"source": "ad", "ratio": _num(c)})
        if any(k in c for k in ["最大生命值", "max health"]):
            scaling.append({"source": "target_max_hp", "ratio": _num(c)})

        effects.append(
            {
                "name": c[:64],
                "trigger": trigger,
                "effect_type": kind,
                "values": values,
                "scaling": scaling,
                "cooldown": _extract_duration(c) if any(k in low for k in ["冷却", "cd", "seconds", "秒"]) else None,
                "duration": _extract_duration(c),
                "caps": None,
                "conditions": [
                    k for k in ["vs_shielded", "vs_low_hp", "vs_immobilized"]
                    if ((k == "vs_shielded" and ("护盾" in c or "shield" in low))
                        or (k == "vs_low_hp" and ("低于" in c or "below" in low))
                        or (k == "vs_immobilized" and ("定身" in c or "immobilized" in low)))
                ],
                "damage_type": damage_type,
                "flags": {
                    "can_crit": "暴击" in c or "crit" in low,
                    "applies_on_hit": trigger == "onHit",
                    "unique": "唯一" in c or "unique" in low,
                },
                "source_line": c,
            }
        )
    if not chunks:
        return [], "empty_description"
    if effects and numeric_hits == 0:
        return effects, "parser_could_not_extract_values"
    return effects, None


CORE_ITEM_EFFECT_OVERRIDES = {
    "死亡之舞": [
        {"name": "Ignore Pain", "trigger": "onDamageTaken", "effect_type": "mitigation", "values": ["30%"], "scaling": [], "cooldown": None, "duration": 3.0, "caps": None, "conditions": [], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Stores 30% of incoming damage and deals it over 3s."},
        {"name": "Defy", "trigger": "onTakedown", "effect_type": "healing", "values": ["10%"], "scaling": [{"source": "bonus_ad", "ratio": 1.2}], "cooldown": None, "duration": None, "caps": None, "conditions": [], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "On takedown, cleanse stored damage and heal."},
    ],
    "神圣分离者": [
        {"name": "Spellblade", "trigger": "onAbilityCast", "effect_type": "damage", "values": ["10%", "6%"], "scaling": [{"source": "target_max_hp", "ratio": 10}], "cooldown": 1.5, "duration": None, "caps": None, "conditions": ["next_basic_attack"], "damage_type": "physical", "flags": {"can_crit": False, "applies_on_hit": True, "unique": True}, "source_line": "After ability cast, next attack deals % max HP damage."},
        {"name": "Sunder Heal", "trigger": "onHit", "effect_type": "healing", "values": ["65%"], "scaling": [{"source": "spellblade_damage", "ratio": 0.65}], "cooldown": 1.5, "duration": None, "caps": None, "conditions": [], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Heal based on spellblade damage dealt."},
    ],
    "斯特拉克": [
        {"name": "Lifeline", "trigger": "onDamageTaken", "effect_type": "shield", "values": ["75%"], "scaling": [{"source": "bonus_hp", "ratio": 0.75}], "cooldown": 60.0, "duration": 4.0, "caps": None, "conditions": ["below_35_hp"], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Gain shield when dropping low."},
    ],
    "冰脉": [
        {"name": "Spellblade Field", "trigger": "onAbilityCast", "effect_type": "cc", "values": ["30%"], "scaling": [], "cooldown": 1.5, "duration": 2.0, "caps": None, "conditions": ["next_basic_attack"], "damage_type": "physical", "flags": {"can_crit": False, "applies_on_hit": True, "unique": True}, "source_line": "Creates slow field after empowered hit."},
    ],
    "荆棘之甲": [
        {"name": "Thorns", "trigger": "onDamageTaken", "effect_type": "damage", "values": ["magic"], "scaling": [{"source": "bonus_armor", "ratio": 0.1}], "cooldown": None, "duration": None, "caps": None, "conditions": ["vs_basic_attackers"], "damage_type": "magic", "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Reflect magic damage when hit."},
        {"name": "Grievous Wounds", "trigger": "onDamageTaken", "effect_type": "anti_heal", "values": ["40%"], "scaling": [], "cooldown": None, "duration": 3.0, "caps": None, "conditions": [], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Apply Grievous Wounds on hit/CC."},
    ],
    "黑色切割者": [
        {"name": "Armor Shred", "trigger": "onDamageDealt", "effect_type": "penetration", "values": ["4%"], "scaling": [], "cooldown": None, "duration": 6.0, "caps": {"max_stacks": 6}, "conditions": ["stacking"], "damage_type": None, "flags": {"can_crit": False, "applies_on_hit": False, "unique": True}, "source_line": "Damaging champions shreds armor, stacking up to 6."},
    ],
}


def fetch_json(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "RiftoCatalogBot/1.0"})
    with urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8", errors="ignore"))


def load_old() -> dict:
    if not OUT.exists():
        return {}
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def hero_records(raw: dict) -> list[dict]:
    source = raw.get("heroList", {}) if isinstance(raw, dict) else {}
    records = []
    for hero_id, data in source.items() if isinstance(source, dict) else []:
        if not isinstance(data, dict):
            continue
        records.append(
            {
                "hero_id": str(data.get("heroId") or hero_id),
                "name": data.get("name") or data.get("title") or f"Hero {hero_id}",
                "alias": data.get("alias") or "",
                "title": data.get("title") or "",
                "lane": data.get("lane") or "",
                "roles": data.get("roles") if isinstance(data.get("roles"), list) else [],
                "icon": data.get("avatar") or "",
            }
        )
    return sorted(records, key=lambda x: x["hero_id"])


def item_records(raw: dict) -> list[dict]:
    source = raw.get("equipList", []) if isinstance(raw, dict) else []
    out = []
    for item in source if isinstance(source, list) else []:
        if not isinstance(item, dict):
            continue
        name = item.get("name") or ""
        parsed_effects, parse_reason = parse_effect_blocks(item.get("description") or "")
        override = next((v for k, v in CORE_ITEM_EFFECT_OVERRIDES.items() if k in str(name)), None)
        effects = override if override else parsed_effects
        out.append(
            {
                "item_id": str(item.get("equipId") or item.get("id") or item.get("itemId") or ""),
                "name": name,
                "icon": item.get("iconPath") or "",
                "price": item.get("price") or 0,
                "description": item.get("description") or "",
                "labels": item.get("labels") if isinstance(item.get("labels"), list) else [],
                "from": item.get("from") if isinstance(item.get("from"), list) else [],
                "into": item.get("into") or "",
                "tags": item.get("tags") or "",
                "combine_cost": item.get("ductRate") or 0,
                "slot_rules": {
                    "unique_passive": bool("唯一" in str(item.get("description") or "") or "unique" in str(item.get("description") or "").lower()),
                    "stackable": False,
                },
                "stats": {
                    "hp": item.get("hp") or 0,
                    "armor": item.get("armor") or 0,
                    "mr": item.get("magicBlock") or 0,
                    "ad": item.get("ad") or 0,
                    "ap": item.get("magicAttack") or 0,
                    "ability_haste": item.get("cd") or 0,
                    "attack_speed": item.get("attackSpeed") or 0,
                    "crit_rate": item.get("critRate") or 0,
                    "armor_pen_flat": item.get("armorPene") or 0,
                    "armor_pen_pct": item.get("armorPeneRate") or 0,
                    "magic_pen_flat": item.get("magicPene") or 0,
                    "magic_pen_pct": item.get("magicPeneRate") or 0,
                    "move_speed_flat": item.get("moveSpeed") or 0,
                    "move_speed_pct": item.get("moveRate") or 0,
                    "hp_regen": item.get("hpRegen") or 0,
                    "hp_regen_pct": item.get("hpRegenRate") or 0,
                    "mana": item.get("mp") or 0,
                    "mana_regen": item.get("mpRegen") or 0,
                    "lifesteal": item.get("healthPerAttack") or 0,
                    "spell_vamp": item.get("healthPerMagic") or 0,
                },
                "effects": effects,
                "effect_parse_status": "override" if override else (parse_reason or "ok"),
                "effect_source": "curated" if override else "auto",
            }
        )
    return sorted(out, key=lambda x: (x["name"], x["item_id"]))


def rune_records(raw: dict) -> list[dict]:
    source = raw.get("runeList", []) if isinstance(raw, dict) else []
    out = []
    for rune in source if isinstance(source, list) else []:
        if not isinstance(rune, dict):
            continue
        effects, reason = parse_effect_blocks(rune.get("description") or "")
        out.append(
            {
                "rune_id": str(rune.get("runeId") or rune.get("id") or ""),
                "name": rune.get("name") or "",
                "icon": rune.get("iconPath") or "",
                "description": rune.get("description") or "",
                "slot": rune.get("slot") or rune.get("classify") or "",
                "effects": effects,
                "effect_parse_status": reason or "ok",
                "effect_source": "auto",
            }
        )
    return sorted(out, key=lambda x: (x["name"], x["rune_id"]))


def skill_records(raw: dict) -> list[dict]:
    source = raw.get("skillList", []) if isinstance(raw, dict) else []
    out = []
    for spell in source if isinstance(source, list) else []:
        if not isinstance(spell, dict):
            continue
        out.append(
            {
                "skill_id": str(spell.get("skillId") or spell.get("id") or ""),
                "name": spell.get("name") or "",
                "icon": spell.get("iconPath") or "",
                "description": spell.get("description") or "",
                "cooldown": spell.get("cd") or spell.get("cooldown") or "",
            }
        )
    return sorted(out, key=lambda x: (x["name"], x["skill_id"]))


def diff_names(old: list[dict], new: list[dict], key_name: str) -> list[str]:
    old_names = {str(x.get(key_name, "")).strip() for x in old if isinstance(x, dict)}
    new_names = {str(x.get(key_name, "")).strip() for x in new if isinstance(x, dict)}
    return sorted(n for n in new_names if n and n not in old_names)


def main() -> None:
    old = load_old()

    hero_raw = fetch_json(HERO_LIST_URL)
    item_raw = fetch_json(EQUIP_URL)
    rune_raw = fetch_json(RUNE_URL)
    skill_raw = fetch_json(SKILL_URL)

    heroes = hero_records(hero_raw)
    items = item_records(item_raw)
    runes = rune_records(rune_raw)
    skills = skill_records(skill_raw)

    old_heroes = old.get("champions", []) if isinstance(old, dict) else []
    old_items = old.get("items", []) if isinstance(old, dict) else []
    old_runes = old.get("runes", []) if isinstance(old, dict) else []
    old_skills = old.get("summonerSpells", []) if isinstance(old, dict) else []

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "heroes": HERO_LIST_URL,
            "items": EQUIP_URL,
            "runes": RUNE_URL,
            "summonerSpells": SKILL_URL,
        },
        "versions": {
            "heroes": hero_raw.get("version") if isinstance(hero_raw, dict) else None,
            "items": item_raw.get("version") if isinstance(item_raw, dict) else None,
            "runes": rune_raw.get("version") if isinstance(rune_raw, dict) else None,
            "summonerSpells": skill_raw.get("version") if isinstance(skill_raw, dict) else None,
        },
        "champions": heroes,
        "items": items,
        "runes": runes,
        "summonerSpells": skills,
        "diff": {
            "newChampions": diff_names(old_heroes, heroes, "name"),
            "newItems": diff_names(old_items, items, "name"),
            "newRunes": diff_names(old_runes, runes, "name"),
            "newSummonerSpells": diff_names(old_skills, skills, "name"),
        },
        "counts": {
            "champions": len(heroes),
            "items": len(items),
            "runes": len(runes),
            "summonerSpells": len(skills),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT} - champs={len(heroes)} items={len(items)} runes={len(runes)} spells={len(skills)}"
    )


if __name__ == "__main__":
    main()
