import json
import re
import requests
from datetime import datetime, timezone
from urllib.parse import urlparse

HERO_LIST_JS_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"
CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS_CN = {
    "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
    "Referer": "https://lolm.qq.com/",
}

def http_get_json(url: str, timeout=12, headers=None):
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    return r.json()

def load_wr_list(path="wr_champions.json"):
    with open(path, "r", encoding="utf-8") as f:
        arr = json.load(f)
    return set(arr) if isinstance(arr, list) else set()

def flatten_rows(x):
    rows = []
    if isinstance(x, list):
        for v in x:
            rows += flatten_rows(v)
    elif isinstance(x, dict):
        if ("hero_id" in x) or ("heroId" in x) or ("win_rate" in x) or ("appear_rate" in x) or ("forbid_rate" in x):
            rows.append(x)
        for v in x.values():
            rows += flatten_rows(v)
    return rows

def to_pct(x):
    try:
        return round(float(x) * 100, 2)
    except Exception:
        return None

def poster_to_en_name(poster_url: str) -> str | None:
    """
    Example:
      .../Posters/Garen_0.jpg -> "Garen"
      .../Posters/Norra_0.jpg -> "Norra"
    """
    if not isinstance(poster_url, str) or not poster_url:
        return None
    path = urlparse(poster_url).path
    filename = path.split("/")[-1]  # Garen_0.jpg
    m = re.match(r"^(.+?)_\d+\.(jpg|png|webp)$", filename, flags=re.IGNORECASE)
    if not m:
        return None
    base = m.group(1)
    # Convert underscores to spaces if needed (rare)
    base = base.replace("_", " ").strip()
    return base

def normalize_wr_name(name: str) -> str:
    """
    Make names match your wr_champions.json as closely as possible.
    """
    if not isinstance(name, str):
        return name
    n = name.strip()

    # Common aliases / formatting
    fixes = {
        "DrMundo": "Dr. Mundo",
        "Nunu": "Nunu & Willump",
        "Kaisa": "Kai'Sa",
        "KaiSa": "Kai'Sa",
        "Khazix": "Kha'Zix",
        "KhaZix": "Kha'Zix",
        "JarvanIV": "Jarvan IV",
        "Jarvan Iv": "Jarvan IV",
        "XinZhao": "Xin Zhao",
        "TwistedFate": "Twisted Fate",
        "MasterYi": "Master Yi",
        "MissFortune": "Miss Fortune",
        "AurelionSol": "Aurelion Sol",
    }
    return fixes.get(n, n)

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    wr_set = load_wr_list()

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent hero_list.js (WR list + icons) + hero_rank_list_v2 (CN stats)",
        "champions": [],
        "statsByName": {},
        "debug": {}
    }

    # 1) Load hero_list.js (JSON) and build id->(en_name, icon)
    hero_list = http_get_json(HERO_LIST_JS_URL, timeout=12)
    hero_list_obj = hero_list.get("heroList", {}) if isinstance(hero_list, dict) else {}

    id_to_info = {}
    for _, obj in (hero_list_obj.items() if isinstance(hero_list_obj, dict) else []):
        if not isinstance(obj, dict):
            continue
        hid = str(obj.get("heroId") or obj.get("hero_id") or "").strip()
        if not hid:
            continue

        poster = obj.get("poster")
        en = poster_to_en_name(poster)
        if en:
            en = normalize_wr_name(en)

        icon = obj.get("avatar") if isinstance(obj.get("avatar"), str) else ""

        # Keep even if en is None; we’ll debug count
        id_to_info[hid] = {"name": en, "icon": icon, "alias": obj.get("alias")}

    meta["debug"]["hero_list_total"] = len(id_to_info)
    meta["debug"]["hero_list_version"] = hero_list.get("version") if isinstance(hero_list, dict) else None
    meta["debug"]["hero_list_fileTime"] = hero_list.get("fileTime") if isinstance(hero_list, dict) else None

    # 2) Load CN rank stats
    raw = http_get_json(CN_RANK_URL, timeout=12, headers=HEADERS_CN)
    rows = flatten_rows(raw.get("data"))
    meta["debug"]["rank_rows_found"] = len(rows)

    # 3) Merge by hero_id -> WR-only by name
    champions_out = {}
    missing_name = 0
    filtered_not_wr = 0

    for r in rows:
        if not isinstance(r, dict):
            continue

        hid = r.get("hero_id") or r.get("heroId")
        if hid is None:
            continue
        hid = str(hid).strip()

        info = id_to_info.get(hid)
        if not info:
            continue

        name = info.get("name")
        if not name:
            missing_name += 1
            continue

        if name not in wr_set:
            filtered_not_wr += 1
            continue

        win = to_pct(r.get("win_rate"))
        pick = to_pct(r.get("appear_rate"))
        ban = to_pct(r.get("forbid_rate"))

        if win is None and pick is None and ban is None:
            continue

        prev = champions_out.get(name, {
            "hero_id": hid,
            "name": name,
            "icon": info.get("icon", ""),
            "stats": {"CN": {"win": 0, "pick": 0, "ban": 0}}
        })

        cn = prev["stats"]["CN"]
        prev["stats"]["CN"] = {
            "win": max(cn.get("win", 0) or 0, win or 0),
            "pick": max(cn.get("pick", 0) or 0, pick or 0),
            "ban": max(cn.get("ban", 0) or 0, ban or 0),
        }
        # ensure icon present
        if info.get("icon"):
            prev["icon"] = info["icon"]

        champions_out[name] = prev

    meta["champions"] = list(champions_out.values())
    meta["statsByName"] = {c["name"]: c["stats"]["CN"] for c in meta["champions"]}

    meta["debug"]["wr_written"] = len(meta["champions"])
    meta["debug"]["missing_en_name_from_poster"] = missing_name
    meta["debug"]["filtered_not_in_wr_list"] = filtered_not_wr
    meta["debug"]["sample_written"] = meta["champions"][:5]

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
