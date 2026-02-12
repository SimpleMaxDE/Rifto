#!/usr/bin/env python3
"""Build champion ability compendium in English from Data Dragon."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

OUT = Path("data/champion_abilities_en.json")
VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
CHAMPION_FULL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/championFull.json"


def fetch_json(url: str) -> dict | list:
    req = Request(url, headers={"User-Agent": "RiftoAbilityBot/1.0"})
    with urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8", errors="ignore"))


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def short_text(text: str, limit: int = 150) -> str:
    text = strip_html(text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def build_payload() -> dict:
    versions = fetch_json(VERSIONS_URL)
    version = versions[0] if isinstance(versions, list) and versions else "latest"
    full = fetch_json(CHAMPION_FULL.format(version=version))
    data = full.get("data", {}) if isinstance(full, dict) else {}

    out = {}
    for champ in data.values() if isinstance(data, dict) else []:
        if not isinstance(champ, dict):
            continue
        name = str(champ.get("name") or "").strip()
        if not name:
            continue
        passive = champ.get("passive", {}) if isinstance(champ.get("passive"), dict) else {}
        spells = champ.get("spells", []) if isinstance(champ.get("spells"), list) else []
        spell_rows = []
        for i, sp in enumerate(spells[:4]):
            if not isinstance(sp, dict):
                continue
            spell_rows.append(
                {
                    "slot": ["Q", "W", "E", "R"][i],
                    "name": str(sp.get("name") or ""),
                    "cooldown": str((sp.get("cooldownBurn") or "").strip()),
                    "description": short_text(str(sp.get("description") or ""), 180),
                }
            )

        out[name] = {
            "title": champ.get("title") or "",
            "passive": {
                "name": str(passive.get("name") or ""),
                "description": short_text(str(passive.get("description") or ""), 180),
            },
            "spells": spell_rows,
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
