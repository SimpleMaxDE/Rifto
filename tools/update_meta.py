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

def http_get_text(url: str, timeout=12, headers=None) -> str:
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    return r.text

def http_get_json(url: str, timeout=12, headers=None):
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    return r.json()

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

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "DEBUG hero_list.js structure",
        "champions": [],
        "statsByName": {},
        "debug": {}
    }

    # 1) hero_list.js debug
    try:
        js = http_get_text(HERO_LIST_JS_URL, timeout=12)
        meta["debug"]["hero_list_len"] = len(js)
        meta["debug"]["hero_list_head"] = js[:1200]
        meta["debug"]["hero_list_tail"] = js[-600:]

        # pattern hit counts
        patterns = {
            "hero_id": r"hero_id",
            "heroid": r"heroid",
            "heroId": r"heroId",
            "en_name": r"en_name",
            "alias": r"alias",
            "name_colon": r"name\s*:",
            "id_colon": r"\bid\s*:",
            "array_open": r"\[",
            "object_open": r"\{",
            "fetch": r"fetch\(",
            "xmlhttprequest": r"XMLHttpRequest",
            "location_href": r"location\.href"
        }
        for k, p in patterns.items():
            meta["debug"][f"hit_{k}"] = len(re.findall(p, js))

    except Exception as e:
        meta["debug"]["hero_list_error"] = str(e)

    # 2) CN rank debug (nur damit wir sehen es ist da)
    try:
        raw = http_get_json(CN_RANK_URL, timeout=12, headers=HEADERS_CN)
        rows = flatten_rows(raw.get("data"))
        meta["debug"]["rank_rows_found"] = len(rows)
    except Exception as e:
        meta["debug"]["rank_error"] = str(e)

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()