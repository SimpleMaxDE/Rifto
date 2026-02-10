import json
import requests
from datetime import datetime, timezone

CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"
HERO_LIST_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_list"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    rank_data = fetch_json(CN_RANK_URL)
    hero_list = fetch_json(HERO_LIST_URL)

    hero_map = {}
    for h in hero_list.get("data", []):
        hero_map[str(h["hero_id"])] = h["hero_name"]

    champions = []

    for row in rank_data.get("data", []):
        hero_id = str(row["hero_id"])
        name = hero_map.get(hero_id, f"Hero {hero_id}")

        champions.append({
            "name": name,
            "hero_id": hero_id,
            "positions": [row.get("position")],
            "stats": {
                "CN": {
                    "win": float(row.get("win_rate", 0)) * 100,
                    "pick": float(row.get("appear_rate", 0)) * 100,
                    "ban": float(row.get("forbid_rate", 0)) * 100,
                }
            }
        })

    meta = {
        "patch": "CN Live",
        "lastUpdated": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M"),
        "source": "Tencent CN (mlol.qt.qq.com)",
        "champions": champions
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
