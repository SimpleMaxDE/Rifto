#!/usr/bin/env python3
"""Build champion combat model with numeric stats + abilities for scoring."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

OUT = Path("data/champion_models.json")
VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
CHAMPION_FULL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/championFull.json"


KEYWORDS = {
    "burst": ["burst", "execute", "detonate"],
    "dps": ["on-hit", "every", "attack speed", "stack"],
    "sustain": ["heal", "restore", "lifesteal", "regenerate"],
    "shield": ["shield"],
    "engage": ["dash", "knock", "pull", "taunt", "stun", "charm"],
    "cc": ["stun", "root", "slow", "knock", "taunt", "charm", "fear", "silence", "airborne"],
}


def fetch_json(url: str):
    req = Request(url, headers={"User-Agent": "RiftoChampionModelBot/1.0"})
    with urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8", errors="ignore"))


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def infer_keywords(champ: dict) -> list[str]:
    blob = " ".join([
        str(champ.get("blurb") or ""),
        str((champ.get("passive") or {}).get("description") or ""),
        " ".join(str((s or {}).get("description") or "") for s in champ.get("spells", []) if isinstance(s, dict)),
    ]).lower()
    out = set()
    for key, words in KEYWORDS.items():
        if any(w in blob for w in words):
            out.add(key)
    for tag in champ.get("tags", []) if isinstance(champ.get("tags"), list) else []:
        t = str(tag).lower()
        if t:
            out.add(t)
    return sorted(out)


def ability_effect_blocks(description: str, ratios: list[dict], cooldown: list) -> list[dict]:
    text = strip_html(description)
    chunks = [x.strip() for x in re.split(r"[.;]", text) if x.strip()]
    out = []
    for c in chunks:
        low = c.lower()
        trigger = "onCast"
        if any(k in low for k in ["on hit", "hits", "damages", "deals damage"]):
            trigger = "onSpellHit"
        if any(k in low for k in ["passive"]):
            trigger = "passive_always"

        effect_type = "modifier"
        damage_type = None
        if "magic damage" in low:
            effect_type = "damage"
            damage_type = "magic"
        elif "physical damage" in low:
            effect_type = "damage"
            damage_type = "physical"
        elif "true damage" in low:
            effect_type = "damage"
            damage_type = "true"
        elif "heal" in low:
            effect_type = "healing"
        elif "shield" in low:
            effect_type = "shield"
        elif any(k in low for k in ["stun", "root", "slow", "airborne", "fear", "charm", "taunt"]):
            effect_type = "cc"

        vals = re.findall(r"\d+(?:\.\d+)?%?", c)
        out.append(
            {
                "name": c[:64],
                "trigger": trigger,
                "effect_type": effect_type,
                "values": vals,
                "scaling": [
                    {"source": str(r.get("link") or ""), "ratio": r.get("coeff")}
                    for r in ratios if isinstance(r, dict)
                ],
                "cooldown": cooldown,
                "duration": None,
                "caps": None,
                "conditions": [
                    flag for flag in ["vs_low_hp", "vs_immobilized", "execute"]
                    if ((flag == "vs_low_hp" and "below" in low)
                        or (flag == "vs_immobilized" and "immobil" in low)
                        or (flag == "execute" and "execute" in low))
                ],
                "damage_type": damage_type,
                "flags": {
                    "applies_on_hit": "on-hit" in low,
                    "can_crit": "crit" in low,
                    "aoe": any(k in low for k in ["area", "nearby", "around"]),
                },
                "source_line": c,
            }
        )
    return out


def spell_model(slot: str, spell: dict) -> dict:
    ratios = []
    for var in spell.get("vars", []) if isinstance(spell.get("vars"), list) else []:
        if not isinstance(var, dict):
            continue
        ratios.append(
            {
                "key": str(var.get("key") or ""),
                "link": str(var.get("link") or ""),
                "coeff": var.get("coeff") if isinstance(var.get("coeff"), list) else [var.get("coeff")],
            }
        )

    effects = []
    for idx, effect in enumerate(spell.get("effectBurn", []) if isinstance(spell.get("effectBurn"), list) else []):
        if idx == 0 or not effect:
            continue
        effects.append({"index": idx, "values": str(effect)})

    description = strip_html(str(spell.get("description") or ""))
    base_damage = next((x.get("values") for x in effects if x.get("index") == 1), "0")
    damage_type = "magic" if "magic damage" in description.lower() else ("physical" if "physical damage" in description.lower() else ("true" if "true damage" in description.lower() else None))
    cc_duration = None
    m = re.search(r"(\d+(?:\.\d+)?)\s*second", description, re.I)
    if m:
        cc_duration = float(m.group(1))
    effect_blocks = ability_effect_blocks(description, ratios, spell.get("cooldown") or [])
    return {
        "slot": slot,
        "name": str(spell.get("name") or ""),
        "cooldown": spell.get("cooldown") or [],
        "cost": spell.get("cost") or [],
        "range": spell.get("range") or [],
        "base_damage": str(base_damage),
        "damage_type": damage_type,
        "cc_duration": cc_duration,
        "damage_effects": effects,
        "ratios": ratios,
        "effects": effect_blocks,
        "effect_parse_status": "ok" if effect_blocks else "parser_could_not_extract_values",
        "description": description,
    }


def build_payload() -> dict:
    versions = fetch_json(VERSIONS_URL)
    version = versions[0] if isinstance(versions, list) and versions else "latest"
    full = fetch_json(CHAMPION_FULL.format(version=version))
    champs = full.get("data", {}) if isinstance(full, dict) else {}

    out = {}
    for champ in champs.values() if isinstance(champs, dict) else []:
        if not isinstance(champ, dict):
            continue
        name = str(champ.get("name") or "").strip()
        if not name:
            continue

        stats = champ.get("stats", {}) if isinstance(champ.get("stats"), dict) else {}
        spells = champ.get("spells", []) if isinstance(champ.get("spells"), list) else []
        passive = champ.get("passive", {}) if isinstance(champ.get("passive"), dict) else {}

        passive_effects = ability_effect_blocks(str(passive.get("description") or ""), [], [])
        out[name] = {
            "id": str(champ.get("id") or ""),
            "title": str(champ.get("title") or ""),
            "resource": str(champ.get("partype") or ""),
            "stats": {
                "hp": stats.get("hp") or 0,
                "hp_per_level": stats.get("hpperlevel") or 0,
                "mp": stats.get("mp") or 0,
                "mp_per_level": stats.get("mpperlevel") or 0,
                "armor": stats.get("armor") or 0,
                "armor_per_level": stats.get("armorperlevel") or 0,
                "mr": stats.get("spellblock") or 0,
                "mr_per_level": stats.get("spellblockperlevel") or 0,
                "ad": stats.get("attackdamage") or 0,
                "ad_per_level": stats.get("attackdamageperlevel") or 0,
                "attack_speed": stats.get("attackspeed") or 0,
                "attack_speed_per_level": stats.get("attackspeedperlevel") or 0,
                "move_speed": stats.get("movespeed") or 0,
                "hp_regen": stats.get("hpregen") or 0,
                "hp_regen_per_level": stats.get("hpregenperlevel") or 0,
            },
            "passive": {
                "name": str(passive.get("name") or ""),
                "description": strip_html(str(passive.get("description") or "")),
                "effects": passive_effects,
                "effect_parse_status": "ok" if passive_effects else "parser_could_not_extract_values",
            },
            "abilities": [
                spell_model("Q", spells[0]) if len(spells) > 0 and isinstance(spells[0], dict) else {},
                spell_model("W", spells[1]) if len(spells) > 1 and isinstance(spells[1], dict) else {},
                spell_model("E", spells[2]) if len(spells) > 2 and isinstance(spells[2], dict) else {},
                spell_model("R", spells[3]) if len(spells) > 3 and isinstance(spells[3], dict) else {},
            ],
            "keywords": infer_keywords(champ),
        }

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": CHAMPION_FULL.format(version=version),
        "version": version,
        "champions": out,
    }


def main() -> None:
    payload = build_payload()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} with {len(payload['champions'])} champions")


if __name__ == "__main__":
    main()
