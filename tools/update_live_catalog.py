#!/usr/bin/env python3
"""Build a local Wild Rift live catalog for champions, items, runes and summoner spells.

Output: data/live_catalog.json
The file keeps a lightweight diff versus the previous snapshot so the app can
highlight new content automatically across all tabs.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"
EQUIP_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/equip/equip.js"
RUNE_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/rune/rune.js"
SKILL_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/skill/skill.js"
OUT = Path("data/live_catalog.json")


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
        out.append(
            {
                "item_id": str(item.get("id") or item.get("itemId") or ""),
                "name": item.get("name") or "",
                "icon": item.get("iconPath") or "",
                "price": item.get("price") or 0,
                "description": item.get("description") or "",
                "labels": item.get("labels") if isinstance(item.get("labels"), list) else [],
            }
        )
    return sorted(out, key=lambda x: (x["name"], x["item_id"]))


def rune_records(raw: dict) -> list[dict]:
    source = raw.get("runeList", []) if isinstance(raw, dict) else []
    out = []
    for rune in source if isinstance(source, list) else []:
        if not isinstance(rune, dict):
            continue
        out.append(
            {
                "rune_id": str(rune.get("runeId") or rune.get("id") or ""),
                "name": rune.get("name") or "",
                "icon": rune.get("iconPath") or "",
                "description": rune.get("description") or "",
                "slot": rune.get("slot") or rune.get("classify") or "",
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
