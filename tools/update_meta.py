import json
import re
import requests
from datetime import datetime, timezone

# 1) Always-works champion list (Wild Rift site page-data)
RIOT_PAGE_DATA = "https://wildrift.leagueoflegends.com/page-data/en-gb/champions/page-data.json"

# 2) Always-works icons (Riot DDragon)
DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
DD_CHAMPS = "https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json"

# 3) Tencent CN stats (might need exact query params → can be empty)
CN_BASE = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url, headers=None):
    r = requests.get(url, headers=headers, timeout=45)
    r.raise_for_status()
    return r.json()

def get_dd_version():
    versions = fetch_json(DD_VERSIONS)
    return versions[0] if versions else "14.1.1"

def get_dd_name_to_id(version):
    data = fetch_json(DD_CHAMPS.format(v=version))["data"]
    m = {}
    for champ in data.values():
        m[champ["name"]] = champ["id"]
    # small aliases
    m.setdefault("Wukong", "MonkeyKing")
    m.setdefault("Dr. Mundo", "DrMundo")
    m.setdefault("Nunu & Willump", "Nunu")
    return m

def get_riot_champ_names():
    data = fetch_json(RIOT_PAGE_DATA)
    nodes = (
        data.get("result", {})
            .get("data", {})
            .get("allContentstackChampion", {})
            .get("nodes", [])
    )
    names = []
    for n in nodes:
        name = n.get("name")
        if name and name not in names:
            names.append(name)
    return names

def try_fetch_tencent_stats():
    """
    Returns stats map by hero_id or by name (unknown), usually empty unless correct params are used.
    We keep it optional so the app always has champions.
    """
    try:
        raw = fetch_json(CN_BASE, HEADERS)
        # We don't know the exact structure without the real query string,
        # so we just return what we can detect.
        return raw
    except Exception as e:
        return {"_error": str(e)}

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    dd_version = get_dd_version()
    dd_name_to_id = get_dd_name_to_id(dd_version)

    champ_names = get_riot_champ_names()

    # Build champion list FIRST (always)
    champions = []
    for name in champ_names:
        cid = dd_name_to_id.get(name, re.sub(r"[^A-Za-z0-9]", "", name))
        icon = f"https://ddragon.leagueoflegends.com/cdn/{dd_version}/img/champion/{cid}.png"
        champions.append({
            "name": name,
            "icon": icon,
            "positions": [],
            "stats": {}   # will be filled later when Tencent stats are wired correctly
        })

    # Try Tencent (optional)
    tencent_raw = try_fetch_tencent_stats()

    meta = {
        "patch": "CN Live (fallback list)",
        "lastUpdated": now,
        "source": "Riot Wild Rift page-data (champ list) + DDragon (icons) + Tencent CN (optional)",
        "ddragonVersion": dd_version,
        "champions": champions,
        # DEBUG so we can see WHY Tencent is empty, without breaking the app:
        "debug": {
            "tencent_url_used": CN_BASE,
            "tencent_keys": list(tencent_raw.keys())[:30] if isinstance(tencent_raw, dict) else str(type(tencent_raw)),
        }
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()