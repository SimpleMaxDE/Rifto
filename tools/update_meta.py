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

def extract_first_js_array(js_text: str):
    """
    hero_list.js is a JS file that contains a big array of hero objects.
    We'll extract the first top-level [...] block and try to parse it.
    """
    start = js_text.find("[")
    if start == -1:
        return None

    # bracket matching to find the matching closing ']'
    depth = 0
    in_str = False
    str_ch = ""
    escape = False

    for i in range(start, len(js_text)):
        ch = js_text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == str_ch:
                in_str = False
            continue
        else:
            if ch in ("'", '"'):
                in_str = True
                str_ch = ch
                continue
            if ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    block = js_text[start:i+1]
                    return block
    return None

def parse_js_array_to_python(block: str):
    """
    Try JSON first. If it isn't valid JSON, do a safe-ish conversion:
    - replace JS literals true/false/null
    - convert single quotes to double quotes when possible
    - remove trailing commas
    """
    # remove trailing commas before } or ]
    cleaned = re.sub(r",\s*([}\]])", r"\1", block)

    # Try JSON directly
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Convert common JS literals for Python eval-like parsing
    cleaned2 = cleaned.replace("null", "null").replace("true", "true").replace("false", "false")

    # Try to coerce single quotes to double quotes (best effort)
    # Only replace quotes around keys/strings that look like 'text'
    cleaned2 = re.sub(r"(?<!\\)'", '"', cleaned2)

    # Remove JS comments if any
    cleaned2 = re.sub(r"//.*?$", "", cleaned2, flags=re.MULTILINE)

    # Try JSON again
    try:
        return json.loads(cleaned2)
    except Exception:
        return None

def build_id_to_name_from_hero_list(hero_list_obj):
    """
    We don't know the exact keys in hero_list.js.
    We'll detect likely fields:
    - hero_id / id
    - name / hero_name / en_name / alias
    """
    id_to_name = {}
    if not isinstance(hero_list_obj, list):
        return id_to_name

    for h in hero_list_obj:
        if not isinstance(h, dict):
            continue

        hid = h.get("hero_id") or h.get("id") or h.get("heroId") or h.get("heroid")
        if hid is None:
            continue
        hid = str(hid)

        # name candidates (prefer English-like)
        candidates = [
            h.get("en_name"),
            h.get("english_name"),
            h.get("alias"),
            h.get("name"),
            h.get("hero_name"),
            h.get("title"),
        ]
        name = next((c for c in candidates if isinstance(c, str) and c.strip()), None)
        if name:
            id_to_name[hid] = name.strip()

    return id_to_name

def flatten_rows(x):
    rows = []
    if isinstance(x, list):
        for v in x:
            rows += flatten_rows(v)
    elif isinstance(x, dict):
        # looks like a row
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

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    wr_set = load_wr_list()

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent hero_rank_list_v2 + hero_list.js mapping",
        "champions": [],
        "statsByName": {},
        "debug": {}
    }

    # 1) Load hero_list.js and build id->name
    try:
        js_text = http_get_text(HERO_LIST_JS_URL, timeout=12)
        block = extract_first_js_array(js_text)
        if not block:
            meta["debug"]["hero_list_error"] = "Could not find array block in hero_list.js"
            block_obj = None
        else:
            block_obj = parse_js_array_to_python(block)
            if block_obj is None:
                meta["debug"]["hero_list_error"] = "Could not parse hero_list.js array (format unexpected)"
        id_to_name = build_id_to_name_from_hero_list(block_obj) if block_obj else {}
        meta["debug"]["hero_list_count"] = len(id_to_name)
    except Exception as e:
        meta["debug"]["hero_list_error"] = str(e)
        id_to_name = {}

    # 2) Load CN rank stats
    try:
        raw = http_get_json(CN_RANK_URL, timeout=12, headers=HEADERS_CN)
        data = raw.get("data")
        rows = flatten_rows(data)
        meta["debug"]["rank_rows_found"] = len(rows)
    except Exception as e:
        meta["debug"]["rank_error"] = str(e)
        rows = []

    # 3) Optional: DDragon icons by name (only used after WR filter)
    dd_version = get_dd_version()
    dd_name_to_id = get_dd_name_to_id(dd_version) if dd_version else {}
    meta["debug"]["dd_version"] = dd_version

    # 4) Merge -> WR-only
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

        # WR-only filter (your wr_champions.json is EN names)
        if name not in wr_set:
            continue

        win = to_pct(r.get("win_rate"))
        pick = to_pct(r.get("appear_rate"))
        ban = to_pct(r.get("forbid_rate"))

        if win is None and pick is None and ban is None:
            continue

        # icon (best effort)
        cid = dd_name_to_id.get(name)
        icon = f"https://ddragon.leagueoflegends.com/cdn/{dd_version}/img/champion/{cid}.png" if (dd_version and cid) else ""

        # keep best/most recent values (simple max)
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
    meta["debug"]["note"] = "If wr_written is still 0, hero_list.js names might be non-EN; then we’ll normalize names."

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
