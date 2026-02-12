#!/usr/bin/env python3
"""Generate official English localization maps for Wild Rift live catalog names.

No free-text machine translation for final names.
Primary source: Riot Data Dragon zh_CN <-> en_US mappings + curated WR-specific aliases.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

CATALOG = Path("data/live_catalog.json")
OUT = Path("data/localization_en.json")

CJK_RE = re.compile(r"[\u3400-\u9fff]")

WR_ITEM_OVERRIDES = {
    "中娅之靴": "Stasis Boots",
    "明朗之靴": "Ionian Boots of Lucidity",
    "水银之靴": "Mercury's Treads",
    "法力之靴": "Mana Boots",
    "爆发之靴": "Boots of Dynamism",
    "狂战士胫甲": "Berserker's Greaves",
    "贪婪之靴": "Gluttonous Greaves",
    "铁板靴": "Plated Steelcaps",
    "原型腰带之靴": "Protobelt Boots",
    "水银饰带": "Quicksilver Enchant",
    "钢铁烈阳": "Locket Enchant",
    "正义荣耀": "Glorious Enchant",
    "石像鬼": "Gargoyle Enchant",
    "和音之律": "Harmonic Echo",
    "流水法杖": "Staff of Flowing Water",
    "海克斯饮魔刀": "Hexdrinker",
    "饮魔刀": "Maw of Malmortius",
    "凡性的提醒": "Mortal Reminder",
    "中娅沙漏": "Zhonya's Hourglass",
    "三相之力": "Trinity Force",
    "万世催化石": "Catalyst of Aeons",
}

WR_RUNE_OVERRIDES = {
    "征服者": "Conqueror",
    "电击": "Electrocute",
    "迅捷步法": "Fleet Footwork",
    "致命节奏": "Lethal Tempo",
    "相位猛冲": "Phase Rush",
    "艾黎": "Summon Aery",
    "黑暗收割": "Dark Harvest",
}

WR_SPELL_OVERRIDES = {
    "闪现": "Flash",
    "引燃": "Ignite",
    "治疗术": "Heal",
    "净化": "Cleanse",
    "惩戒": "Smite",
    "屏障": "Barrier",
    "幽灵疾步": "Ghost",
    "虚弱": "Exhaust",
    "传送": "Teleport",
    "清晰术": "Clarity",
    "标记": "Mark",
}


def fetch_json(url: str):
    req = Request(url, headers={"User-Agent": "RiftoLocalizationBot/1.0"})
    with urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8", errors="ignore"))


def contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def ddragon_version() -> str:
    versions = fetch_json("https://ddragon.leagueoflegends.com/api/versions.json")
    return versions[0]


def zh_en_item_map(version: str) -> dict[str, str]:
    zh = fetch_json(f"https://ddragon.leagueoflegends.com/cdn/{version}/data/zh_CN/item.json")
    en = fetch_json(f"https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/item.json")
    out = {}
    for item_id, zh_row in zh.get("data", {}).items():
        en_row = en.get("data", {}).get(item_id)
        if not isinstance(zh_row, dict) or not isinstance(en_row, dict):
            continue
        zn = str(zh_row.get("name") or "").strip()
        en_name = str(en_row.get("name") or "").strip()
        if zn and en_name:
            out[zn] = en_name
    return out


def zh_en_spell_map(version: str) -> dict[str, str]:
    zh = fetch_json(f"https://ddragon.leagueoflegends.com/cdn/{version}/data/zh_CN/summoner.json")
    en = fetch_json(f"https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/summoner.json")
    out = {}
    for key, zh_row in zh.get("data", {}).items():
        en_row = en.get("data", {}).get(key)
        if not isinstance(zh_row, dict) or not isinstance(en_row, dict):
            continue
        zn = str(zh_row.get("name") or "").strip()
        en_name = str(en_row.get("name") or "").strip()
        if zn and en_name:
            out[zn] = en_name
    return out


def zh_en_rune_map() -> dict[str, str]:
    zh = fetch_json("https://ddragon.leagueoflegends.com/cdn/15.23.1/data/zh_CN/runesReforged.json")
    en = fetch_json("https://ddragon.leagueoflegends.com/cdn/15.23.1/data/en_US/runesReforged.json")

    def flatten(rows):
        m = {}
        for r in rows:
            if not isinstance(r, dict):
                continue
            rid = str(r.get("id"))
            if rid and r.get("name"):
                m[rid] = str(r["name"])
            for s in r.get("slots", []) if isinstance(r.get("slots"), list) else []:
                for rr in s.get("runes", []) if isinstance(s.get("runes"), list) else []:
                    if isinstance(rr, dict) and rr.get("id") and rr.get("name"):
                        m[str(rr["id"])] = str(rr["name"])
        return m

    zh_map = flatten(zh if isinstance(zh, list) else [])
    en_map = flatten(en if isinstance(en, list) else [])
    out = {}
    for rid, zn in zh_map.items():
        en_name = en_map.get(rid)
        if zn and en_name:
            out[zn] = en_name
    return out


def compose_name(name: str, mapping: dict[str, str]) -> str | None:
    if name in mapping:
        return mapping[name]
    if "·" not in name:
        return None
    parts = [p.strip() for p in name.split("·") if p.strip()]
    out = []
    for p in parts:
        en = mapping.get(p)
        if not en:
            return None
        out.append(en)
    return " · ".join(out) if out else None


def build_map(names: list[str], mapping: dict[str, str], prefix: str) -> dict[str, str]:
    out = {}
    for idx, name in enumerate(names, start=1):
        n = str(name or "").strip()
        if not n:
            continue
        if not contains_cjk(n):
            out[n] = n
            continue
        composed = compose_name(n, mapping)
        out[n] = composed if composed else f"Unmapped {prefix} {idx}"
    return out


def main() -> None:
    if not CATALOG.exists():
        raise SystemExit("Missing data/live_catalog.json. Run update_live_catalog.py first.")

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    version = ddragon_version()

    item_map = {}
    item_map.update(zh_en_item_map(version))
    item_map.update(WR_ITEM_OVERRIDES)

    rune_map = {}
    rune_map.update(zh_en_rune_map())
    rune_map.update(WR_RUNE_OVERRIDES)

    spell_map = {}
    spell_map.update(zh_en_spell_map(version))
    spell_map.update(WR_SPELL_OVERRIDES)

    item_names = sorted({str(x.get("name", "")).strip() for x in catalog.get("items", []) if isinstance(x, dict)})
    rune_names = sorted({str(x.get("name", "")).strip() for x in catalog.get("runes", []) if isinstance(x, dict)})
    spell_names = sorted({str(x.get("name", "")).strip() for x in catalog.get("summonerSpells", []) if isinstance(x, dict)})

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "items": build_map(item_names, item_map, "Item"),
        "runes": build_map(rune_names, rune_map, "Rune"),
        "summonerSpells": build_map(spell_names, spell_map, "Spell"),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT} - items={len(payload['items'])} runes={len(payload['runes'])} spells={len(payload['summonerSpells'])}"
    )


if __name__ == "__main__":
    main()
