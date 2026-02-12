#!/usr/bin/env python3
"""Fetch latest Wild Rift patch page and build machine-readable patch intel.

Output: data/patch_notes_live.json
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

BASE = "https://wildrift.leagueoflegends.com"
LISTING = f"{BASE}/en-gb/news/game-updates/"
OUT = Path("data/patch_notes_live.json")
META = Path("meta.json")

BUFF_WORDS = ["buff", "increased", "increase", "stronger", "improved", "up"]
NERF_WORDS = ["nerf", "decreased", "decrease", "reduced", "weaker", "down"]
ITEM_HINTS = {
    "Blade of the Ruined King": ["marksman", "fighter", "anti_tank"],
    "Searing Crown": ["tank", "hard_engage"],
    "Zeke's Convergence": ["tank_support", "support"],
    "Infinity Edge": ["marksman"],
    "Rabadon's Deathcap": ["mage"],
}


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": "RiftoPatchBot/1.0"})
    with urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="ignore")


def latest_patch_url(listing_html: str) -> str:
    links = re.findall(r'href="([^"]+/news/game-updates/[^"]+)"', listing_html)
    for link in links:
        if "patch-" in link:
            return urljoin(BASE, link)
    return LISTING


def patch_from_text(text: str) -> str:
    m = re.search(r"Patch\s+([0-9]+\.[0-9]+[a-z]?)", text, re.I)
    return m.group(1) if m else "7.0c"


def clean_text(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_champion_names() -> list[str]:
    if not META.exists():
        return []
    data = json.loads(META.read_text(encoding="utf-8"))
    champs = data.get("champions", [])
    return sorted({str(c.get("name", "")).strip() for c in champs if c.get("name")}, key=len, reverse=True)


def detect_champion_changes(text: str, champ_names: list[str]):
    low = text.lower()
    buffs, nerfs = [], []
    for name in champ_names:
        n = name.lower()
        idx = low.find(n)
        if idx < 0:
            continue
        window = low[max(0, idx - 120): idx + 200]
        if any(w in window for w in BUFF_WORDS):
            buffs.append({"name": name, "delta": 1.0, "note": "Automatisch erkannt: Buff/Verbesserung im Patchtext."})
        elif any(w in window for w in NERF_WORDS):
            nerfs.append({"name": name, "delta": -1.0, "note": "Automatisch erkannt: Nerf/Abschwächung im Patchtext."})
    # de-dup
    uniq = lambda arr: list({x["name"]: x for x in arr}.values())
    return uniq(buffs), uniq(nerfs)


def detect_item_changes(text: str):
    low = text.lower()
    out = []
    for item, tags in ITEM_HINTS.items():
        i = item.lower()
        idx = low.find(i)
        if idx < 0:
            continue
        window = low[max(0, idx - 120): idx + 180]
        direction = "changed"
        delta = 0.6
        if any(w in window for w in BUFF_WORDS):
            direction = "buff"
            delta = 1.0
        elif any(w in window for w in NERF_WORDS):
            direction = "nerf"
            delta = -1.0
        out.append({
            "name": item,
            "direction": direction,
            "impactTags": tags,
            "delta": delta,
            "note": "Automatisch erkannt aus den offiziellen Patchnotes."
        })
    return out


def main() -> None:
    listing = fetch(LISTING)
    patch_url = latest_patch_url(listing)
    patch_html = fetch(patch_url)
    text = clean_text(patch_html)

    patch = patch_from_text(text)
    champs = load_champion_names()
    buffs, nerfs = detect_champion_changes(text, champs)
    items = detect_item_changes(text)

    payload = {
        "patch": patch,
        "sourceUrl": patch_url,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "championBuffs": buffs,
        "championNerfs": nerfs,
        "itemChanges": items,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} for patch {patch}")


if __name__ == "__main__":
    main()
