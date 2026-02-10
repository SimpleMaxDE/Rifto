import json
import requests
from datetime import datetime, timezone

CN_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url: str, timeout_seconds: int = 8):
    r = requests.get(url, headers=HEADERS, timeout=timeout_seconds)
    r.raise_for_status()
    return r.json()

def load_wr_list(path="wr_champions.json"):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return set(data) if isinstance(data, list) else set()

def flatten_rows(data_obj):
    """
    Tencent can return:
    - data: list[dict]
    - data: dict[str -> list[dict]]
    - deeper nesting
    We walk recursively and yield dict rows that contain hero_id or win_rate.
    """
    rows = []
    if isinstance(data_obj, list):
        for x in data_obj:
            rows += flatten_rows(x)
    elif isinstance(data_obj, dict):
        # if this looks like a row, keep it
        if ("hero_id" in data_obj) or ("win_rate" in data_obj) or ("appear_rate" in data_obj) or ("forbid_rate" in data_obj):
            rows.append(data_obj)
        for v in data_obj.values():
            rows += flatten_rows(v)
    return rows

def to_pct(x):
    try:
        return round(float(x) * 100, 2)
    except Exception:
        return None

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    wr_set = load_wr_list()

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent CN (mlol.qt.qq.com hero_rank_list_v2)",
        "statsByName": {},
        "debug": {}
    }

    try:
        raw = fetch_json(CN_URL, timeout_seconds=8)
        data = raw.get("data")
        rows = flatten_rows(data)

        # We don’t have a guaranteed name field, so we try common keys
        # If Tencent provides hero_name in any row, we use it.
        # Otherwise we’ll skip (next step is to map via hero_list.js for perfect names/icons).
        used = 0
        skipped_no_name = 0
        skipped_not_wr = 0

        for r in rows:
            if not isinstance(r, dict):
                continue

            name = r.get("hero_name") or r.get("name") or r.get("champion_name")
            if not name:
                skipped_no_name += 1
                continue

            # WR-only filter
            if name not in wr_set:
                skipped_not_wr += 1
                continue

            win = to_pct(r.get("win_rate"))
            pick = to_pct(r.get("appear_rate"))
            ban = to_pct(r.get("forbid_rate"))

            if win is None and pick is None and ban is None:
                continue

            # If champ appears multiple times, keep the "best" populated values by simple max
            prev = meta["statsByName"].get(name, {})
            meta["statsByName"][name] = {
                "win": max(prev.get("win", 0) or 0, win or 0) if (win is not None or prev) else win,
                "pick": max(prev.get("pick", 0) or 0, pick or 0) if (pick is not None or prev) else pick,
                "ban": max(prev.get("ban", 0) or 0, ban or 0) if (ban is not None or prev) else ban,
            }
            used += 1

        meta["debug"] = {
            "tencent_status": 200,
            "rows_found": len(rows),
            "stats_written": len(meta["statsByName"]),
            "rows_used": used,
            "skipped_no_name": skipped_no_name,
            "skipped_not_wr": skipped_not_wr,
            "note": "If stats_written is low, next step is hero_list.js mapping (hero_id -> WR name)."
        }

    except Exception as e:
        meta["debug"]["tencent_error"] = str(e)

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()