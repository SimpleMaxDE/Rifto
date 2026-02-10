import json
import requests
from datetime import datetime, timezone

# Tencent CN stats
CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

# Riot Data Dragon (for champion names + icons)
DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
DD_CHAMPS = "https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url, headers=None):
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()

def get_dd_version():
    return fetch_json(DD_VERSIONS)[0]

def get_champion_map(version):
    data = fetch_json(DD_CHAMPS.format(v=version))
    champ_map = {}
    for champ in data["data"].values():
        champ_map[champ["key"]] = {
            "name": champ["name"],
            "icon": champ["image"]["full"]
        }
    return champ_map

def main():
    rank_data = fetch_json(CN_RANK_URL, HEADERS)
    dd_version = get_dd_version()
    champ_map = get_champion_map(dd_version)

    champions = []

    for row in rank_data.get("data", []):
        hero_id = str(row.get("hero_id"))
        champ = champ_map.get(hero_id)

        if not champ:
            continue  # skip unknown IDs

        champions.append({
            "name": champ["name"],
            "icon": f"https://ddragon.leagueoflegends.com/cdn/{dd_version}/img/champion/{champ['icon']}",
            "positions": [row.get("position")],
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
        "source": "Tencent CN + Riot DDragon",
        "champions": champions
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
