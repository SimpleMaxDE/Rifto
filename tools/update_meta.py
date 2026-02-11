import json
import requests
from datetime import datetime

RANK_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/hero_rank_list_v2.json"

def main():
    response = requests.get(RANK_URL, timeout=15)
    response.raise_for_status()

    rank_data = response.json()

    with open("wr_champions.json", "r", encoding="utf-8") as f:
        base_champs = json.load(f)

    champions = []

    hero_rank = rank_data.get("heroRank", {})

    for champ in base_champs:
        cid = str(champ["id"])
        stats = hero_rank.get(cid)
        if not stats:
            continue

        champions.append({
            "id": champ["id"],
            "name": champ["name"],
            "lanes": champ["lanes"],
            "roles": champ["roles"],
            "stats": {
                "win": stats["winRate"],
                "pick": stats["pickRate"],
                "ban": stats["banRate"]
            }
        })

    meta = {
        "patch": "CN Live",
        "updated": datetime.utcnow().isoformat(),
        "champions": champions
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()