import json
import re
import requests
from datetime import datetime, timezone

HERO_LIST_JS_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"
CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS_CN = {
    "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
    "Referer": "https://lolm.qq.com/",
}

DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
DD_CHAMPS = "https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json"


def http_get_text(url: str, timeout=12, headers=None) -> str:
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    return r.text


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
        if ("hero_id" in x) or ("win_rate" in x) or ("appear_rate" in x) or ("forbid_rate" in x):
            rows.append(x)
        for v in x.values():
            rows += flatten_rows(v)
    return rows


def to_pct(x):
    try:
        return round(float(x) * 100, 2)
    except Exception:
        return None


def get_dd_version():
    try:
        versions = http_get_json(DD_VERSIONS, timeout=12)
        return versions[0] if versions else None
    except Exception:
        return None


def get_dd_name_to_id(version: str):
    if not version:
        return {}
    try:
        data = http_get_json(DD_CHAMPS.format(v=version), timeout=12)
        out = {}
        for champ in data.get("data", {}).values():
            out[champ["name"]] = champ["id"]
        # aliases
        out.setdefault("Wukong", "MonkeyKing")
        out.setdefault("Dr. Mundo", "DrMundo")
        out.setdefault("Nunu & Willump", "Nunu")
        return out
    except Exception:
        return {}


def extract_id_to_name_from_hero_list_js(js_text: str):
    """
    Robust parser:
    Find every hero_id occurrence, then look shortly after it for a name field.
    Works even if file is not JSON.
    """
    id_to_name = {}

    # Find hero_id occurrences (different key styles)
    hero_id_pattern = re.compile(r"(?:hero_id|heroid|heroId|id)\s*[:=]\s*['\"]?(\d{3,})['\"]?")
    # Name candidates inside the same object chunk
    # We prefer en_name / alias if present, else name / hero_name
    name_patterns = [
        re.compile(r"en_name\s*[:=]\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"english_name\s*[:=]\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"alias\s*[:=]\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"hero_name\s*[:=]\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"name\s*[:=]\s*['\"]([^'\"]+)['\"]"),
        re.compile(r"title\s*[:=]\s*['\"]([^'\"]+)['\"]"),
    ]

    matches = list(hero_id_pattern.finditer(js_text))
    for m in matches:
        hid = m.group(1)
        # Look ahead in a window after hero_id for the name fields
        start = m.end()
        window = js_text[start:start + 800]  # enough to cover fields in same object
        name = None
        for pat in name_patterns:
            mm = pat.search(window)
            if mm:
                name = mm.group(1).strip()
                break
        if name:
            id_to_name[str(hid)] = name

    return id_to_name


def normalize_name(name: str) -> str:
    """
    Minimal normalization so WR list matches:
    """
    if not isinstance(name, str):
        return name

    n = name.strip()

    # Common WR name formatting fixes
    aliases = {
        "Wukong": "Wukong",
        "MonkeyKing": "Wukong",
        "DrMundo": "Dr. Mundo",
        "Dr Mundo": "Dr. Mundo",
        "Nunu": "Nunu & Willump",
        "NunuandWillump": "Nunu & Willump",
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
    }
    return aliases.get(n, n)


def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    wr_set = load_wr_list()

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent hero_rank_list_v2 + hero_list.js (regex parsed)",
        "champions": [],
        "statsByName": {},
        "debug": {}
    }

    # 1) Load hero_list.js -> id->name
    try:
        js_text = http_get_text(HERO_LIST_JS_URL, timeout=12)
        id_to_rawname = extract_id_to_name_from_hero_list_js(js_text)
        # normalize names
        id_to_name = {hid: normalize_name(nm) for hid, nm in id_to_rawname.items() if nm}
        meta["debug"]["hero_list_count"] = len(id_to_name)
        # small sample for sanity
        sample = list(id_to_name.items())[:5]
        meta["debug"]["hero_list_sample"] = sample
    except Exception as e:
        meta["debug"]["hero_list_error"] = str(e)
        id_to_name = {}

    # 2) Load CN stats
    try:
        raw = http_get_json(CN_RANK_URL, timeout=12, headers=HEADERS_CN)
        rows = flatten_rows(raw.get("data"))
        meta["debug"]["rank_rows_found"] = len(rows)
    except Exception as e:
        meta["debug"]["rank_error"] = str(e)
        rows = []

    # 3) Icons (best-effort, optional)
    dd_version = get_dd_version()
    dd_name_to_id = get_dd_name_to_id(dd_version) if dd_version else {}
    meta["debug"]["dd_version"] = dd_version

    # 4) Merge WR-only
    champions_out = {}

    for r in rows:
        if not isinstance(r, dict):
            continue
        hid = r.get("hero_id")
        if hid is None:
            continue
        hid = str(hid)

        name = id_to_name.get(hid)
        if not name:
            continue

        if name not in wr_set:
            continue

        win = to_pct(r.get("win_rate"))
        pick = to_pct(r.get("appear_rate"))
        ban = to_pct(r.get("forbid_rate"))

        if win is None and pick is None and ban is None:
            continue

        cid = dd_name_to_id.get(name)
        icon = f"https://ddragon.leagueoflegends.com/cdn/{dd_version}/img/champion/{cid}.png" if (dd_version and cid) else ""

        prev = champions_out.get(name, {"hero_id": hid, "name": name, "icon": icon, "stats": {"CN": {}}})
        cn = prev["stats"]["CN"]
        prev["stats"]["CN"] = {
            "win": max(cn.get("win", 0) or 0, win or 0),
            "pick": max(cn.get("pick", 0) or 0, pick or 0),
            "ban": max(cn.get("ban", 0) or 0, ban or 0),
        }
        prev["hero_id"] = hid
        if icon:
            prev["icon"] = icon
        champions_out[name] = prev

    meta["champions"] = list(champions_out.values())
    meta["statsByName"] = {c["name"]: c["stats"]["CN"] for c in meta["champions"]}
    meta["debug"]["wr_written"] = len(meta["champions"])

    # Helpful note if still zero
    if meta["debug"]["hero_list_count"] == 0:
        meta["debug"]["note"] = "hero_list.js parsed 0 entries; file format likely changed -> we can adjust regex once we see its raw content structure."
    elif meta["debug"]["wr_written"] == 0:
        meta["debug"]["note"] = "hero_list parsed, but names didn't match wr_champions.json; likely non-EN names or different field (need en_name/alias)."

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()