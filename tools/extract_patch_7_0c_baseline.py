#!/usr/bin/env python3
"""Build OCR baseline dataset for Wild Rift patch 7.0C screenshots."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = ROOT / "WR Screenshots 7.0C"
OUTPUT_PATH = ROOT / "data" / "baseline_patch_7_0c.json"

ITEM_HINTS = {"ability haste", "attack damage", "ability power", "critical rate", "critical strike", "magic resist", "movement speed", "armor", "max health", "mana", "omnivamp", "lifesteal", "grievous wounds", "unique passive", "gold", "cost"}
CHAMPION_HINTS = {"difficulty", "fighter", "mage", "assassin", "marksman", "support", "tank", "role", "lane", "champion", "abilities", "durability", "control"}
ROLE_WORDS = {"fighter", "mage", "assassin", "marksman", "support", "tank"}
STOP_NAMES = {"wild rift", "abilities", "recommended", "build", "owned", "details", "cost", "gold", "patch", "overview", "items"}


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parse_name(lines: list[str]) -> str | None:
    for raw in lines[:20]:
        line = normalize(raw)
        if not line:
            continue
        low = line.lower()
        if low in STOP_NAMES:
            continue
        if any(ch.isdigit() for ch in line):
            continue
        if sum(ch.isalpha() for ch in line) < 3 or len(line) > 36:
            continue
        return line.title()
    return None


def parse_numeric_effects(lines: list[str]) -> list[str]:
    out: list[str] = []
    for raw in lines:
        line = normalize(raw)
        if not line:
            continue
        has_num = bool(re.search(r"\d", line))
        has_stat_word = bool(re.search(r"(damage|armor|health|haste|speed|mana|vamp|resist|cooldown|shield|heal|crit|penetration)", line, flags=re.IGNORECASE))
        if has_num and (has_stat_word or "%" in line or "+" in line):
            out.append(line)
    return list(dict.fromkeys(out))


def classify(text: str) -> str:
    lowered = text.lower()
    item_hits = sum(1 for hint in ITEM_HINTS if hint in lowered)
    champion_hits = sum(1 for hint in CHAMPION_HINTS if hint in lowered)
    if item_hits > champion_hits and item_hits >= 1:
        return "item"
    if champion_hits >= item_hits and champion_hits >= 1:
        return "champion"
    return "unknown"


def run_ocr(ocr: RapidOCR, image: Path) -> list[str]:
    with Image.open(image) as im:
        im = im.convert("RGB")
        max_side = max(im.size)
        if max_side > 1600:
            scale = 1600 / max_side
            im = im.resize((int(im.width * scale), int(im.height * scale)))
        arr = np.array(im)
    result, _ = ocr(arr)
    return [] if not result else [normalize(row[1]) for row in result if normalize(row[1])]


def main() -> None:
    ocr = RapidOCR()
    image_paths = sorted([*SCREENSHOT_DIR.rglob("*.jpg"), *SCREENSHOT_DIR.rglob("*.jpeg"), *SCREENSHOT_DIR.rglob("*.png")])

    items, champions, unknown = [], [], []
    for idx, image in enumerate(image_paths, start=1):
        if idx % 25 == 0:
            print(f"Processed {idx}/{len(image_paths)}", flush=True)

        lines = run_ocr(ocr, image)
        text = "\n".join(lines)
        category = classify(text)
        record = {
            "source_image": str(image.relative_to(ROOT)),
            "detected_name": parse_name(lines),
            "effects_or_stats": parse_numeric_effects(lines),
            "ocr_lines": lines,
        }

        if category == "item":
            items.append(record)
        elif category == "champion":
            record["roles"] = sorted({role for role in ROLE_WORDS if re.search(rf"\b{role}\b", text.lower())})
            champions.append(record)
        else:
            unknown.append(record)

    payload = {
        "patch": "7.0C",
        "baseline_id": "patch_7_0c",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_directory": str(SCREENSHOT_DIR.relative_to(ROOT)),
        "source_image_count": len(image_paths),
        "classification_counts": Counter({"items": len(items), "champions": len(champions), "unknown": len(unknown)}),
        "items": items,
        "champions": champions,
        "unknown": unknown,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote baseline: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
