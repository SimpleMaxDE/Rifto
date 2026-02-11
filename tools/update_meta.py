import json
import requests
from datetime import datetime

RANK_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/hero_rank_list_v2.json"

def main():
    rank_data = requests.get(RANK_URL, timeout=15).json()
    champions_base = json.load(open("wr_champions.json", "r", encoding="utf-8"))

    champs = []

    for champ in champions_base:
        cid = str(champ["id"])
        stats = rank_data.get("heroRank", {}).get(cid)

        if not stats:
            continue

        champs.append({
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
        "champions": champs
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()