import json
import requests
from datetime import datetime, timezone

# --- Sources ---
# Riot page-data URLs change sometimes -> try multiple
RIOT_PAGE_DATA_CANDIDATES = [
    "https://wildrift.leagueoflegends.com/page-data/en-gb/champions/page-data.json",
    "https://wildrift.leagueoflegends.com/page-data/en-us/champions/page-data.json",
    "https://wildrift.leagueoflegends.com/page-data/de-de/champions/page-data.json",
]

# Tencent CN stats base (may need params; still optional)
CN_BASE = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

# DDragon for icons (stable)
DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
DD_CHAMPS = "https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json"

HEADERS_CN = {
    "User-Agent": "Mozilla/5.0 (RIFTO personal project)",
    "Referer": "https://lolm.qq.com/",
}

def safe_get_json(url, headers=None, timeout=45):
    try:
        r = requests.get(url, headers=headers, timeout=timeout)
        if r.status_code != 200:
            return None, f"{r.status_code} {r.reason}"
        return r.json(), None
    except Exception as e:
        return None, str(e)

def get_dd_version():
    data, err = safe_get_json(DD_VERSIONS)
    if not data:
        return "14.1.1", f"dd_versions_error={err}"
    return (data[0] if data else "14.1.1"), None

def get_dd_name_to_id(version):
    data, err = safe_get_json(DD_CHAMPS.format(v=version))
    if not data:
        return {}, f"dd_champs_error={err}"
    out = {}
    for champ in data["data"].values():
        out[champ["name"]] = champ["id"]
    # common aliases
    out.setdefault("Wukong", "MonkeyKing")
    out.setdefault("Dr. Mundo", "DrMundo")
    out.setdefault("Nunu & Willump", "Nunu")
    return out, None

def get_riot_champ_names(debug):
    for url in RIOT_PAGE_DATA_CANDIDATES:
        data, err = safe_get_json(url)
        if data:
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
            debug["riot_page_data_used"] = url
            return names
        else:
            debug.setdefault("riot_page_data_errors", []).append({ "url": url, "error": err })
    return []

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    debug = {}

    dd_version, ddv_err = get_dd_version()
    if ddv_err:
        debug["dd_version_error"] = ddv_err

    dd_name_to_id, dd_err = get_dd_name_to_id(dd_version)
    if dd_err:
        debug["dd_champs_error"] = dd_err

    # 1) Champion list (try Riot; if fails, fallback to DDragon names)
    champ_names = get_riot_champ_names(debug)
    if not champ_names:
        # fallback: use DDragon names (may include non-WR champs, but app won't be empty)
        champ_names = list(dd_name_to_id.keys())
        debug["fallback"] = "Used DDragon champion names (Riot page-data unavailable)"

    # 2) Build champion objects + icons
    champions = []
    for name in champ_names:
        cid = dd_name_to_id.get(name)
        icon = ""
        if cid:
            icon = f"https://ddragon.leagueoflegends.com/cdn/{dd_version}/img/champion/{cid}.png"
        champions.append({
            "name": name,
            "icon": icon,
            "positions": [],
            "stats": {}  # CN stats can be added later
        })

    # 3) Try Tencent CN (optional; don't fail workflow)
    cn_data, cn_err = safe_get_json(CN_BASE, headers=HEADERS_CN)
    if cn_err:
        debug["tencent_error"] = cn_err
    else:
        # We keep raw keys for debugging; full parsing comes next once we have the full query URL
        if isinstance(cn_data, dict):
            debug["tencent_keys"] = list(cn_data.keys())[:30]
        else:
            debug["tencent_type"] = str(type(cn_data))

    meta = {
        "patch": "CN Live (safe mode)",
        "lastUpdated": now,
        "source": "Riot page-data (when available) + DDragon (icons) + Tencent (optional)",
        "ddragonVersion": dd_version,
        "champions": champions,
        "debug": debug
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()