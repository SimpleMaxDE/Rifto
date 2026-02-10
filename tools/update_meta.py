import json
import requests
from datetime import datetime, timezone

BASE_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

# Tencent lanes (as used by the site)
LANES = {
    "TOP": "1",
    "JUNGLE": "2",
    "MID": "3",
    "ADC": "4",
    "SUPPORT": "5",
}

def fetch_json(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    champions = {}
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    for lane_name, lane_id in LANES.items():
        url = (
            f"{BASE_URL}"
            f"?partition=0"
            f"&queue=420"
            f"&tier=1"
            f"&position={lane_id}"
        )

        data = fetch_json(url).get("data", [])

        if not isinstance(data, list):
            continue

        for row in data:
            hero_id = str(row.get("hero_id", "")).strip()
            if not hero_id:
                continue

            # Create champion if not exists
            if hero_id not in champions:
                champions[hero_id] = {
                    "name": f"Hero {hero_id}",  # placeholder (icons/names next step)
                    "hero_id": hero_id,
                    "positions": [],
                    "stats": {
                        "CN": {
                            "win": 0,
                            "pick": 0,
                            "ban": 0,
                        }
                    }
                }

            champions[hero_id]["positions"].append(lane_name)

            # Average stats across lanes
            champions[hero_id]["stats"]["CN"]["win"] += float(row.get("win_rate", 0))
            champions[hero_id]["stats"]["CN"]["pick"] += float(row.get("appear_rate", 0))
            champions[hero_id]["stats"]["CN"]["ban"] += float(row.get("forbid_rate", 0))

    # Finalize averages
    for champ in champions.values():
        count = max(len(champ["positions"]), 1)
        champ["stats"]["CN"]["win"] = round((champ["stats"]["CN"]["win"] / count) * 100, 2)
        champ["stats"]["CN"]["pick"] = round((champ["stats"]["CN"]["pick"] / count) * 100, 2)
        champ["stats"]["CN"]["ban"] = round((champ["stats"]["CN"]["ban"] / count) * 100, 2)

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent CN (mlol.qt.qq.com hero_rank_list_v2)",
        "champions": list(champions.values())
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
