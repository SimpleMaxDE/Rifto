#!/usr/bin/env python3
"""Build OCR baseline dataset for Wild Rift patch 7.0C screenshots with tooltip-focused OCR."""
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

ITEM_HINTS = {"ability haste", "attack damage", "ability power", "critical strike", "magic resist", "movement speed", "armor", "max health", "mana", "omnivamp", "lifesteal", "grievous", "unique passive", "cost"}
CHAMPION_HINTS = {"difficulty", "fighter", "mage", "assassin", "marksman", "support", "tank", "role", "lane", "champion", "durability", "control"}
ROLE_WORDS = {"fighter", "mage", "assassin", "marksman", "support", "tank"}
STOP_NAMES = {"wild rift", "abilities", "recommended", "build", "owned", "details", "cost", "gold", "patch", "overview", "items"}


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def prep_image(im: Image.Image, max_side: int = 1600) -> np.ndarray:
    im = im.convert("RGB")
    ms = max(im.size)
    if ms > max_side:
        scale = max_side / ms
        im = im.resize((int(im.width * scale), int(im.height * scale)))
    return np.array(im)


def tooltip_crop(im: Image.Image) -> Image.Image:
    # Right-side tooltip pane where item/champion text is displayed.
    w, h = im.size
    x0 = int(w * 0.48)
    y0 = int(h * 0.08)
    x1 = int(w * 0.99)
    y1 = int(h * 0.95)
    return im.crop((x0, y0, x1, y1))


def run_ocr(ocr: RapidOCR, arr: np.ndarray) -> list[str]:
    result, _ = ocr(arr)
    return [] if not result else [normalize(r[1]) for r in result if normalize(r[1])]


def parse_name(lines: list[str]) -> str | None:
    for raw in lines[:24]:
        line = normalize(raw)
        if not line:
            continue
        low = line.lower()
        if low in STOP_NAMES:
            continue
        if any(ch.isdigit() for ch in line):
            continue
        if sum(ch.isalpha() for ch in line) < 3 or len(line) > 42:
            continue
        return line.title()
    return None


def parse_numeric_effects(lines: list[str]) -> list[str]:
    out = []
    for raw in lines:
        line = normalize(raw)
        if not line:
            continue
        if re.search(r"\d", line) and ("+" in line or "%" in line or re.search(r"(damage|armor|health|haste|speed|mana|vamp|resist|cooldown|shield|heal|crit|penetration)", line, flags=re.I)):
            out.append(line)
    return list(dict.fromkeys(out))


def classify(text: str) -> str:
    lowered = text.lower()
    ih = sum(1 for h in ITEM_HINTS if h in lowered)
    ch = sum(1 for h in CHAMPION_HINTS if h in lowered)
    if ih > ch and ih >= 1:
        return "item"
    if ch >= ih and ch >= 1:
        return "champion"
    return "unknown"


def main() -> None:
    ocr = RapidOCR()
    images = sorted([*SCREENSHOT_DIR.rglob("*.jpg"), *SCREENSHOT_DIR.rglob("*.jpeg"), *SCREENSHOT_DIR.rglob("*.png")])

    items, champions, unknown = [], [], []
    for idx, p in enumerate(images, start=1):
        if idx % 25 == 0:
            print(f"Processed {idx}/{len(images)}", flush=True)
        with Image.open(p) as im:
            full_lines = run_ocr(ocr, prep_image(im))
            tip_lines = run_ocr(ocr, prep_image(tooltip_crop(im), max_side=1400))

        lines = tip_lines if tip_lines else full_lines
        text = "\n".join(lines)
        rec = {
            "source_image": str(p.relative_to(ROOT)),
            "detected_name": parse_name(lines),
            "effects_or_stats": parse_numeric_effects(lines),
            "ocr_lines": lines,
            "ocr_lines_full": full_lines,
            "ocr_lines_tooltip": tip_lines,
            "ocr_text_raw": "\n".join(lines),
        }

        cat = classify(text)
        if cat == "item":
            items.append(rec)
        elif cat == "champion":
            rec["roles"] = sorted({r for r in ROLE_WORDS if re.search(rf"\b{r}\b", text.lower())})
            champions.append(rec)
        else:
            unknown.append(rec)

    payload = {
        "patch": "7.0C",
        "baseline_id": "patch_7_0c",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_directory": str(SCREENSHOT_DIR.relative_to(ROOT)),
        "source_image_count": len(images),
        "classification_counts": Counter({"items": len(items), "champions": len(champions), "unknown": len(unknown)}),
        "items": items,
        "champions": champions,
        "unknown": unknown,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote baseline: {OUTPUT_PATH} | items={len(items)} champions={len(champions)} unknown={len(unknown)}")


if __name__ == "__main__":
    main()
