#!/usr/bin/env python3
"""Create structured patch 7.0C truth data with normalized effects schema."""
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


def slugify(text: str) -> str:
    toks = tokenize(text)
    return "_".join(toks[:6]) if toks else "effect"


def best_match(text: str, candidates: list[str]) -> Match:
    tnorm = norm(text)
    best_name, best_score = None, 0.0
    for c in candidates:
        cn = norm(c)
        if not cn:
            continue
        if cn in tnorm:
            score = 1.0
        else:
            score = SequenceMatcher(None, tnorm[:600], cn).ratio()
            for tok in tokenize(c):
                if len(tok) >= 4 and tok in tnorm:
                    score = max(score, 0.78)
        if score > best_score:
            best_name, best_score = c, score
    return Match(best_name, best_score)


def infer_lane(text: str) -> list[str]:
    low = text.lower()
    lanes = []
    for lane, kws in ROLE_KEYWORDS.items():
        if any(k in low for k in kws):
            lanes.append(lane)
    return sorted(set(lanes))


def _first_num(text: str) -> float | None:
    m = re.search(r"([+\-]?\d+(?:\.\d+)?)", text)
    return float(m.group(1)) if m else None


def _first_pct(text: str) -> float | None:
    m = re.search(r"([+\-]?\d+(?:\.\d+)?)\s*%", text)
    return float(m.group(1)) if m else None


def parse_effect_line(line: str) -> dict | None:
    raw = line.strip()
    if not raw:
        return None
    low = raw.lower()
    if not re.search(r"passive|active|damage|heal|shield|grievous|cooldown|stack|trigger|immobil|slow|stun|penetration|resist|haste|mana|health", low):
        return None
    if re.fullmatch(r"[0-9/ .:+%-]+", low):
        return None

    trigger = "passive_always"
    if any(k in low for k in ["active", "on activation"]):
        trigger = "active_cast"
    elif any(k in low for k in ["on hit", "every attack", "basic attack"]):
        trigger = "on_hit"
    elif any(k in low for k in ["spell", "ability"]):
        trigger = "on_spell"
    elif any(k in low for k in ["takedown", "kill", "assist"]):
        trigger = "on_takedown"

    effect_type = "modifier"
    if "damage" in low:
        effect_type = "damage"
    elif any(k in low for k in ["heal", "restore", "regen"]):
        effect_type = "healing"
    elif "shield" in low:
        effect_type = "shield"
    elif "grievous" in low:
        effect_type = "anti_heal"
    elif any(k in low for k in ["penetration", "pen"]):
        effect_type = "penetration"
    elif any(k in low for k in ["slow", "stun", "immobil", "root", "fear", "charm"]):
        effect_type = "cc"

    damage_type = None
    if "magic" in low:
        damage_type = "magic"
    elif "physical" in low:
        damage_type = "physical"
    elif "true damage" in low:
        damage_type = "true"

    scaling_type, scaling_ratio = None, None
    if any(k in low for k in ["ability power", " ap", "ap "]):
        scaling_type, scaling_ratio = "AP", _first_num(low)
    elif any(k in low for k in ["attack damage", " ad", "ad "]):
        scaling_type, scaling_ratio = "AD", _first_num(low)
    elif "max health" in low:
        scaling_type, scaling_ratio = "MaxHP", _first_pct(low)

    duration = None
    m_dur = re.search(r"(\d+(?:\.\d+)?)\s*(seconds?|s)", low)
    if m_dur:
        duration = float(m_dur.group(1))

    cooldown = None
    m_cd = re.search(r"(?:cooldown|cd)\s*(?:of)?\s*(\d+(?:\.\d+)?)", low)
    if m_cd:
        cooldown = {"value": float(m_cd.group(1)), "scope": "global"}
    elif "per target" in low:
        cooldown = {"value": None, "scope": "per_target"}

    max_stacks = None
    m_stack = re.search(r"(?:max(?:imum)?\s*)?(\d+)\s*stacks?", low)
    if m_stack:
        max_stacks = int(m_stack.group(1))

    cond = []
    if "only" in low or "cannot" in low:
        cond.append(raw)

    return {
        "effect_id": slugify(raw),
        "effect_name": (raw[:80] or "effect"),
        "trigger": trigger,
        "effect_type": effect_type,
        "base_value": _first_num(low),
        "scaling_ratio": scaling_ratio,
        "scaling_type": scaling_type,
        "duration": duration,
        "cooldown": cooldown,
        "stacks": bool(max_stacks),
        "max_stacks": max_stacks,
        "conditions": cond,
        "limitations": cond,
        "damage_type": damage_type,
    }


def normalize_effect_schema(effect: dict) -> dict:
    # map catalog/live effect entries into required schema fields
    vals = effect.get("values") if isinstance(effect.get("values"), list) else []
    base_val = None
    for v in vals:
        n = _first_num(str(v))
        if n is not None:
            base_val = n
            break
    scaling = effect.get("scaling") if isinstance(effect.get("scaling"), list) else []
    scaling_ratio = None
    scaling_type = None
    if scaling:
        s0 = scaling[0] if isinstance(scaling[0], dict) else {}
        scaling_ratio = s0.get("ratio") if isinstance(s0.get("ratio"), (int, float)) else _first_num(str(s0.get("ratio", "")))
        scaling_type = str(s0.get("source", "")).upper() or None

    max_stacks = None
    caps = effect.get("caps")
    if isinstance(caps, dict) and isinstance(caps.get("max_stacks"), int):
        max_stacks = caps.get("max_stacks")

    cd = effect.get("cooldown")
    cd_value = cd if isinstance(cd, (int, float)) else _first_num(str(cd or ""))
    cd_obj = {"value": cd_value, "scope": "global"} if cd_value is not None else None

    cond = effect.get("conditions") if isinstance(effect.get("conditions"), list) else []
    eff_name = str(effect.get("name") or effect.get("source_line") or "effect")[:80] or "effect"
    return {
        "effect_id": slugify(eff_name),
        "effect_name": eff_name,
        "trigger": str(effect.get("trigger") or "passive_always"),
        "effect_type": str(effect.get("effect_type") or "modifier"),
        "base_value": base_val,
        "scaling_ratio": scaling_ratio,
        "scaling_type": scaling_type,
        "duration": effect.get("duration") if isinstance(effect.get("duration"), (int, float)) else _first_num(str(effect.get("duration", ""))),
        "cooldown": cd_obj,
        "stacks": bool(max_stacks),
        "max_stacks": max_stacks,
        "conditions": cond,
        "limitations": cond,
        "damage_type": effect.get("damage_type") if isinstance(effect.get("damage_type"), str) else None,
    }


def recommendation_tags(text: str) -> list[str]:
    low = text.lower()
    tags = set()
    if "grievous" in low:
        tags.add("anti_heal")
    if "magic resist" in low or "mr" in low:
        tags.add("anti_magic")
    if "armor" in low:
        tags.add("anti_physical")
    if "magic penetration" in low:
        tags.add("vs_magic_resist")
    if "armor penetration" in low:
        tags.add("vs_armor_stack")
    return sorted(tags)


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
    catalog_item_by_name = {str(x.get("name", "")): x for x in catalog_items if isinstance(x, dict)}

    def canonical_item_name(name: str) -> str:
        if name in catalog_item_by_name:
            return name
        zh = en_to_zh_item.get(name, "")
        if zh:
            return zh
        return name

    records = [*baseline.get("items", []), *baseline.get("champions", []), *baseline.get("unknown", [])]
    items: dict[str, dict] = {}
    champions: dict[str, dict] = {}

    for rec in records:
        lines = rec.get("ocr_lines", []) if isinstance(rec, dict) else []
        raw_text = str(rec.get("ocr_text_raw") or "\n".join(lines))
        if not raw_text.strip():
            continue
        im = best_match(raw_text, item_name_pool)
        cm = best_match(raw_text, champ_name_pool)

        kind = "unknown"
        if im.score >= 0.84 and im.score >= cm.score:
            kind = "item"
        elif cm.score >= 0.8 and cm.score > im.score:
            kind = "champion"

        if kind == "item" and im.name:
            canon = canonical_item_name(im.name)
            row = items.setdefault(canon, {"name": canon, "images": [], "ocr_texts": [], "match": 0.0})
            row["images"].append(rec.get("source_image"))
            row["ocr_texts"].append(raw_text)
            row["match"] = max(row["match"], im.score)
        elif kind == "champion" and cm.name:
            row = champions.setdefault(cm.name, {"name": cm.name, "images": [], "texts": [], "match": 0.0, "lanes": set(), "roles": set()})
            row["images"].append(rec.get("source_image"))
            row["texts"].append(raw_text)
            row["match"] = max(row["match"], cm.score)
            for lane in infer_lane(raw_text):
                row["lanes"].add(lane)
            for role in ["fighter", "mage", "assassin", "marksman", "support", "tank"]:
                if role in raw_text.lower():
                    row["roles"].add(role)

    item_rows = []

    # ensure full item coverage from catalog too
    for name in sorted(set(list(items.keys()) + list(catalog_item_by_name.keys()))):
        row = items.get(name, {"name": name, "images": [], "ocr_texts": [], "match": 0.0})
        cat = catalog_item_by_name.get(name, {})
        if not cat:
            zh = en_to_zh_item.get(name, "")
            if zh:
                cat = catalog_item_by_name.get(zh, {})

        ocr_blob = "\n".join(row.get("ocr_texts", []))
        effects = []
        ocr_effects = []
        catalog_effects = []
        for ln in [x for x in ocr_blob.splitlines() if x.strip()]:
            fx = parse_effect_line(ln)
            if fx:
                fx["source"] = "ocr"
                effects.append(fx)
                ocr_effects.append(fx)

        if isinstance(cat, dict) and isinstance(cat.get("effects"), list):
            for fx in cat["effects"]:
                if isinstance(fx, dict):
                    nfx = normalize_effect_schema(fx)
                    nfx["source"] = "catalog"
                    effects.append(nfx)
                    catalog_effects.append(nfx)

        # dedupe by effect_name
        uniq = {}
        for fx in effects:
            key = (fx.get("effect_id"), fx.get("trigger"), fx.get("effect_type"))
            if key not in uniq:
                uniq[key] = fx
        effects = list(uniq.values())

        item_rows.append({
            "name": name,
            "image_count": len(row.get("images", [])),
            "images": sorted(set([x for x in row.get("images", []) if x])),
            "match_confidence": round(float(row.get("match", 0.0)), 3),
            "ocr_text_raw": ocr_blob,
            "effects": effects,
            "effects_ocr_count": len(ocr_effects),
            "effects_catalog_count": len(catalog_effects),
            "recommendation_tags": recommendation_tags(ocr_blob),
            "catalog_compare": {
                "exists_in_live_catalog": bool(cat),
                "item_id": str(cat.get("item_id", "")) if isinstance(cat, dict) else "",
                "icon_available": bool(cat.get("icon")) if isinstance(cat, dict) else False,
                "price": cat.get("price", None) if isinstance(cat, dict) else None,
            },
        })

    catalog_champ_by_name = {str(x.get("name", "")): x for x in catalog_champs if isinstance(x, dict)}
    champ_rows = []
    for name, row in sorted(champions.items(), key=lambda kv: (-len(kv[1]["images"]), kv[0])):
        cat = catalog_champ_by_name.get(name, {})
        champ_rows.append({
            "name": name,
            "image_count": len(row["images"]),
            "images": sorted(set([x for x in row["images"] if x])),
            "match_confidence": round(row["match"], 3),
            "lanes_detected_by_text": sorted(row["lanes"]),
            "roles_detected_by_text": sorted(row["roles"]),
            "catalog_compare": {
                "exists_in_live_catalog_name_match": bool(cat),
                "lane_from_catalog": cat.get("lane", "") if isinstance(cat, dict) else "",
                "roles_from_catalog": cat.get("roles", []) if isinstance(cat, dict) else [],
                "icon_available_live_catalog": bool(cat.get("icon")) if isinstance(cat, dict) else False,
                "exists_in_wr_champion_list": name in set(champ_names),
                "exists_in_champion_models": bool(champion_models.get(name)),
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
            "matched_item_entities": sum(1 for x in item_rows if x["image_count"] > 0),
            "catalog_item_entities": len(item_rows),
            "matched_champion_entities": len(champ_rows),
            "items_with_effects": sum(1 for x in item_rows if len(x.get("effects", [])) > 0),
            "items_with_ocr_effects": sum(1 for x in item_rows if x.get("effects_ocr_count", 0) > 0),
            "items_with_icon_in_catalog": sum(1 for x in item_rows if x["catalog_compare"]["icon_available"]),
        },
        "items": item_rows,
        "champions": champ_rows,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} | items={len(item_rows)} champs={len(champ_rows)} items_with_effects={payload['summary']['items_with_effects']}")


if __name__ == "__main__":
    main()
