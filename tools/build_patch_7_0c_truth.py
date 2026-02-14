#!/usr/bin/env python3
"""Create a high-detail structured truth dataset for patch 7.0C from OCR baseline.

Input: data/baseline_patch_7_0c.json (full-folder OCR output)
Output: data/patch_7_0c_truth.json
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "data" / "baseline_patch_7_0c.json"
OUT = ROOT / "data" / "patch_7_0c_truth.json"
LIVE_CATALOG = ROOT / "data" / "live_catalog.json"
LOCALIZATION = ROOT / "data" / "localization_en.json"
WR_CHAMPIONS = ROOT / "wr_champions.json"
CHAMPION_MODELS = ROOT / "data" / "champion_models.json"

STAT_PATTERNS = {
    "ability_power": [r"ability\s*power", r"\bap\b"],
    "attack_damage": [r"attack\s*damage", r"\bad\b"],
    "ability_haste": [r"ability\s*haste", r"\bhaste\b"],
    "armor": [r"\barmor\b"],
    "magic_resist": [r"magic\s*resist", r"\bmr\b"],
    "max_health": [r"max\s*health", r"\bhp\b", r"health"],
    "max_mana": [r"max\s*mana", r"\bmana\b"],
    "attack_speed_pct": [r"attack\s*speed"],
    "critical_rate_pct": [r"critical\s*(rate|strike)", r"\bcrit\b"],
    "armor_pen_pct": [r"armor\s*penetration", r"armor\s*pen"],
    "magic_pen_pct": [r"magic\s*penetration", r"magic\s*pen"],
    "move_speed_pct": [r"movement\s*speed", r"move\s*speed"],
    "lifesteal_pct": [r"lifesteal"],
    "omnivamp_pct": [r"omnivamp"],
}

ROLE_KEYWORDS = {
    "baron": ["baron", "solo"],
    "jungle": ["jungle"],
    "mid": ["mid"],
    "dragon": ["dragon", "duo", "adc"],
    "support": ["support"],
}


@dataclass
class Match:
    name: str | None
    score: float


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(s).lower())


def tokenize(s: str) -> list[str]:
    return [x for x in re.split(r"[^a-z0-9]+", str(s).lower()) if x]


def extract_num(s: str) -> float | None:
    m = re.search(r"([+\-]?\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None


def best_match(text: str, candidates: list[str]) -> Match:
    tnorm = norm(text)
    best_name = None
    best_score = 0.0
    for c in candidates:
        cn = norm(c)
        if not cn:
            continue
        if cn in tnorm:
            score = 1.0
        else:
            score = SequenceMatcher(None, tnorm[:400], cn).ratio()
            for tok in tokenize(c):
                if len(tok) >= 4 and tok in tnorm:
                    score = max(score, 0.75)
        if score > best_score:
            best_name, best_score = c, score
    return Match(best_name, best_score)


def infer_lane(text: str) -> list[str]:
    low = text.lower()
    lanes: list[str] = []
    for lane, kws in ROLE_KEYWORDS.items():
        if any(k in low for k in kws):
            lanes.append(lane)
    return sorted(set(lanes))


def parse_stat_line(line: str) -> tuple[str, float] | None:
    low = line.lower().replace("%", " % ")
    value = extract_num(low)
    if value is None:
        return None
    for key, pats in STAT_PATTERNS.items():
        if any(re.search(p, low) for p in pats):
            return key, value
    return None


def recommendation_tags(lines: list[str], stats: dict[str, dict]) -> list[str]:
    text = "\n".join(lines).lower()
    tags = set()
    if "grievous" in text or "anti-heal" in text:
        tags.add("anti_heal")
    if "magic resist" in text or "mr" in text:
        tags.add("anti_magic")
    if "armor" in text:
        tags.add("anti_physical")
    if "magic penetration" in text:
        tags.add("vs_magic_resist")
    if "armor penetration" in text:
        tags.add("vs_armor_stack")
    if "shield" in text:
        tags.add("anti_burst_or_shield")
    if "mana" in text and ("ability_haste" in stats or "ability_power" in stats):
        tags.add("mana_scaling_mage")
    if "lifesteal" in text or "omnivamp" in text:
        tags.add("sustain")
    return sorted(tags)

def is_effect_line(line: str) -> bool:
    low = line.lower()
    return any(k in low for k in [
        "passive", "active", "damage", "shield", "heal", "cooldown", "grievous",
        "immobil", "slow", "stun", "mana charge", "awe", "stack", "triggers"
    ])


def main() -> None:
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    catalog = json.loads(LIVE_CATALOG.read_text(encoding="utf-8"))
    loc = json.loads(LOCALIZATION.read_text(encoding="utf-8"))
    champ_names = json.loads(WR_CHAMPIONS.read_text(encoding="utf-8"))
    champion_models = json.loads(CHAMPION_MODELS.read_text(encoding="utf-8")).get("champions", {})

    catalog_items = catalog.get("items", []) if isinstance(catalog, dict) else []
    catalog_champs = catalog.get("champions", []) if isinstance(catalog, dict) else []
    item_name_pool = sorted({*(x.get("name", "") for x in catalog_items if isinstance(x, dict)), *loc.get("items", {}).keys(), *loc.get("items", {}).values()})
    en_to_zh_item = {v: k for k, v in (loc.get("items", {}) or {}).items() if isinstance(v, str) and isinstance(k, str)}
    champ_name_pool = sorted({*champ_names, *(x.get("name", "") for x in catalog_champs if isinstance(x, dict))})

    records = [*baseline.get("items", []), *baseline.get("champions", []), *baseline.get("unknown", [])]

    items: dict[str, dict] = {}
    champions: dict[str, dict] = {}
    unmatched: list[dict] = []

    for rec in records:
        lines = rec.get("ocr_lines", []) if isinstance(rec, dict) else []
        text = "\n".join(lines)
        if not text.strip():
            continue
        imatch = best_match(text, item_name_pool)
        cmatch = best_match(text, champ_name_pool)

        # classify with confidence + hints
        hint_item = sum(1 for k in ["ability power", "armor", "mana", "gold", "passive", "cost"] if k in text.lower())
        hint_champ = sum(1 for k in ["difficulty", "fighter", "marksman", "mage", "assassin", "support", "tank"] if k in text.lower())

        kind = "unknown"
        if imatch.score >= 0.85 and imatch.score >= cmatch.score:
            kind = "item"
        elif cmatch.score >= 0.80 and cmatch.score > imatch.score:
            kind = "champion"
        elif hint_item > hint_champ:
            kind = "item"
        elif hint_champ >= hint_item and hint_champ > 0:
            kind = "champion"

        if kind == "item" and imatch.name:
            key = imatch.name
            row = items.setdefault(key, {
                "name": imatch.name,
                "aliases_detected": set(),
                "images": [],
                "stats_detected": defaultdict(list),
                "effects_detected": set(),
                "raw_lines": [],
                "max_match_score": 0.0,
            })
            if rec.get("detected_name"):
                row["aliases_detected"].add(str(rec["detected_name"]))
            row["images"].append(rec.get("source_image"))
            row["raw_lines"].extend(lines)
            row["max_match_score"] = max(row["max_match_score"], imatch.score)
            for line in lines:
                parsed = parse_stat_line(line)
                if parsed:
                    stat, value = parsed
                    row["stats_detected"][stat].append(value)
                if is_effect_line(line):
                    row["effects_detected"].add(line.strip())
        elif kind == "champion" and cmatch.name:
            key = cmatch.name
            row = champions.setdefault(key, {
                "name": cmatch.name,
                "images": [],
                "lanes_detected_by_text": set(),
                "roles_detected_by_text": set(),
                "raw_lines": [],
                "max_match_score": 0.0,
            })
            row["images"].append(rec.get("source_image"))
            row["raw_lines"].extend(lines)
            row["max_match_score"] = max(row["max_match_score"], cmatch.score)
            for lane in infer_lane(text):
                row["lanes_detected_by_text"].add(lane)
            for role in ["fighter", "mage", "assassin", "marksman", "support", "tank"]:
                if role in text.lower():
                    row["roles_detected_by_text"].add(role)
        else:
            unmatched.append({
                "source_image": rec.get("source_image"),
                "detected_name": rec.get("detected_name"),
                "item_match": {"name": imatch.name, "score": round(imatch.score, 3)},
                "champion_match": {"name": cmatch.name, "score": round(cmatch.score, 3)},
            })

    # finalize + compare against live catalog (names/icons/values)
    catalog_item_by_name = {str(x.get("name", "")): x for x in catalog_items if isinstance(x, dict)}
    catalog_champ_by_name = {str(x.get("name", "")): x for x in catalog_champs if isinstance(x, dict)}

    item_rows = []
    for name, row in sorted(items.items(), key=lambda kv: (-len(kv[1]["images"]), kv[0])):
        cat = catalog_item_by_name.get(name, {})
        if not cat:
            zh = en_to_zh_item.get(name, "")
            if zh:
                cat = catalog_item_by_name.get(zh, {})
        stats_summary = {}
        for sk, vals in row["stats_detected"].items():
            vals_sorted = sorted(vals)
            stats_summary[sk] = {
                "min": vals_sorted[0],
                "max": vals_sorted[-1],
                "samples": vals_sorted[:15],
                "count": len(vals_sorted),
            }
        tags = recommendation_tags(row["raw_lines"], stats_summary)
        item_rows.append({
            "name": name,
            "aliases_detected": sorted(row["aliases_detected"]),
            "image_count": len(row["images"]),
            "images": sorted(set([x for x in row["images"] if x])),
            "match_confidence": round(row["max_match_score"], 3),
            "stats_detected": stats_summary,
            "effects_detected": sorted(row["effects_detected"]),
            "recommendation_tags": tags,
            "catalog_compare": {
                "exists_in_live_catalog": bool(cat),
                "item_id": str(cat.get("item_id", "")) if isinstance(cat, dict) else "",
                "icon_available": bool(cat.get("icon")) if isinstance(cat, dict) else False,
                "price": cat.get("price", None) if isinstance(cat, dict) else None,
                "catalog_stats": cat.get("stats", {}) if isinstance(cat, dict) else {},
            },
        })

    champ_rows = []
    for name, row in sorted(champions.items(), key=lambda kv: (-len(kv[1]["images"]), kv[0])):
        cat = catalog_champ_by_name.get(name, {})
        in_models = bool(champion_models.get(name))
        in_wr_list = name in set(champ_names)
        champ_rows.append({
            "name": name,
            "image_count": len(row["images"]),
            "images": sorted(set([x for x in row["images"] if x])),
            "match_confidence": round(row["max_match_score"], 3),
            "lanes_detected_by_text": sorted(row["lanes_detected_by_text"]),
            "roles_detected_by_text": sorted(row["roles_detected_by_text"]),
            "catalog_compare": {
                "exists_in_live_catalog_name_match": bool(cat),
                "lane_from_catalog": cat.get("lane", "") if isinstance(cat, dict) else "",
                "roles_from_catalog": cat.get("roles", []) if isinstance(cat, dict) else [],
                "icon_available_live_catalog": bool(cat.get("icon")) if isinstance(cat, dict) else False,
                "exists_in_wr_champion_list": in_wr_list,
                "exists_in_champion_models": in_models,
            },
        })

    payload = {
        "patch": "7.0C",
        "baseline_id": "patch_7_0c",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "baseline_file": str(BASELINE.relative_to(ROOT)),
            "source_directory": baseline.get("source_directory"),
            "source_image_count": baseline.get("source_image_count"),
        },
        "summary": {
            "matched_item_entities": len(item_rows),
            "matched_champion_entities": len(champ_rows),
            "unmatched_screenshots": len(unmatched),
            "items_with_icon_in_catalog": sum(1 for x in item_rows if x["catalog_compare"]["icon_available"]),
            "champions_with_icon_in_catalog": sum(1 for x in champ_rows if x["catalog_compare"]["icon_available_live_catalog"]),
            "champions_with_wr_name_match": sum(1 for x in champ_rows if x["catalog_compare"]["exists_in_wr_champion_list"]),
            "champions_with_model_match": sum(1 for x in champ_rows if x["catalog_compare"]["exists_in_champion_models"]),
        },
        "items": item_rows,
        "champions": champ_rows,
        "unmatched": unmatched,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} | items={len(item_rows)} champions={len(champ_rows)} unmatched={len(unmatched)}")


if __name__ == "__main__":
    main()
