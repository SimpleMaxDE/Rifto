import json
import requests
from datetime import datetime, timezone

CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url, headers=None):
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    rank_data = fetch_json(CN_RANK_URL, HEADERS)

    champions = []
    data = rank_data.get("data", {})

    # Tencent response is nested: data is a dict -> lane/segment -> list of rows
    if isinstance(data, dict):
        items = data.items()
    else:
        items = []

    for lane, rows in items:
        if not isinstance(rows, list):
            continue

        for row in rows:
            if not isinstance(row, dict):
                continue

            hero_id = str(row.get("hero_id", "")).strip()
            if not hero_id:
                continue

            # IMPORTANT: Don't drop champs if we can't map names yet
            name = row.get("hero_name") or f"Hero {hero_id}"

            champions.append({
                "name": name,
                "hero_id": hero_id,
                "icon": "",  # will be filled in later when we map to real icons
                "positions": [str(lane)],
                "stats": {
                    "CN": {
                        "win": round(float(row.get("win_rate", 0)) * 100, 2),
                        "pick": round(float(row.get("appear_rate", 0)) * 100, 2),
                        "ban": round(float(row.get("forbid_rate", 0)) * 100, 2),
                    }
                }
            })

    meta = {
        "patch": "CN Live",
        "lastUpdated": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M"),
        "source": "Tencent CN (mlol.qt.qq.com hero_rank_list_v2)",
        "champions": champions
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
