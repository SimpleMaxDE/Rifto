import json
import re
from datetime import datetime, timezone

import requests

# --- Sources ---
RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"
HERO_LIST_JS_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"

# Tencent endpoints können picky sein -> mit Referer + UA läuft’s stabiler
HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO; +https://github.com/)",
    "Accept": "application/json,text/plain,*/*",
    "Referer": "https://lolm.qq.com/act/a20220818raider/index.html",
}

TIMEOUT = 20


def fetch_text(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()
    return r.text


def fetch_json(url: str):
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()

    # Wenn Tencent mal HTML/leer liefert, wollen wir das im Log sehen
    txt = r.text.strip()
    if not txt or (txt[:1] not in "{["):
        raise ValueError(f"Expected JSON but got: {txt[:200]}")

    return r.json()


def parse_hero_list_js(js_text: str) -> dict:
    """
    hero_list.js ist JS mit viel Zeug, aber irgendwo drin steckt ein JSON-String:
      "heroList": { ... }, "version":"7.0", ...
    Wir extrahieren den JSON-String robust und json.loads() den.
    """
    # 1) Versuch: JSON-String nach "heroList" im JS finden
    # Oft ist es sowas wie:  var heroListData = {"heroList":{...},"version":"..."}
    # oder in einem String-Feld.
    # Wir nehmen den größten JSON-Block, der "heroList" enthält.
    candidates = []

    # großer {...}-Block der heroList enthält
    for m in re.finditer(r"\{[^{}]*\"heroList\"\s*:\s*\{", js_text):
        start = m.start()
        # finde das passende Ende indem wir ab start die letzte schließende } nehmen
        # (robust genug weil file sowieso fast nur dieses Monster-Objekt enthält)
        tail = js_text[start:]
        end = tail.rfind("}")
        if end != -1:
            block = tail[: end + 1]
            candidates.append(block)

    # 2) Falls hero_list.js das JSON in einem String escaped hat:
    # "hero_list_head":"{...","hero_list_tail":"...}"
    # -> dann head+tail zusammenkleben (dein Screenshot zeigt GENAU das!)
    head = re.search(r"\"hero_list_head\"\s*:\s*\"(.*?)\"\s*,", js_text, re.S)
    tail = re.search(r"\"hero_list_tail\"\s*:\s*\"(.*?)\"\s*,", js_text, re.S)
    if head and tail:
        combined_escaped = head.group(1) + tail.group(1)
        # escaped string -> echte JSON chars
        combined = combined_escaped.encode("utf-8").decode("unicode_escape")
        combined = combined.replace("\\/", "/")
        combined = combined.replace('\\"', '"')
        combined = combined.strip()
        candidates.insert(0, combined)

    # Versuch die Kandidaten zu parsen
    for c in candidates:
        try:
            return json.loads(c)
        except Exception:
            continue

    raise ValueError("Could not parse hero_list.js into JSON (format changed).")


def normalize_lane_cn_to_en(lane_cn: str) -> str:
    """
    Tencent hero_list.js hat lanes oft CN/mit ; getrennt.
    Wir normalisieren grob für UI.
    """
    if not lane_cn:
        return "Unknown"
    s = lane_cn

    mapping = {
        "单人路": "Baron",
        "打野": "Jungle",
        "中路": "Mid",
        "下路": "ADC",
        "辅助": "Support",
    }
    # oft "单人路;打野"
    parts = [p.strip() for p in s.split(";") if p.strip()]
    out = []
    for p in parts:
        out.append(mapping.get(p, p))
    return ";".join(out) if out else "Unknown"


def build_wr_champions(hero_list_json: dict) -> dict:
    hero_list = hero_list_json.get("heroList", {})
    # heroList Keys sind ids als string
    champs = {}
    for hero_id_str, info in hero_list.items():
        try:
            hid = str(info.get("heroId") or hero_id_str)
        except Exception:
            hid = str(hero_id_str)

        name = info.get("alias") or info.get("name") or f"Hero {hid}"
        avatar = info.get("avatar") or ""
        lane_raw = info.get("lane") or ""
        lanes = normalize_lane_cn_to_en(lane_raw)

        champs[hid] = {
            "hero_id": hid,
            "name": name,
            "icon": avatar,
            "lanes": lanes,
        }
    return champs


def build_meta(rank_data: list, wr_champs: dict) -> dict:
    """
    rank_data ist Liste von Stats-Objekten:
    hero_id, win_rate, appear_rate, forbid_rate ...
    """
    champions = []
    for row in rank_data:
        # row sollte dict sein
        if not isinstance(row, dict):
            continue

        hero_id = str(row.get("hero_id") or row.get("heroId") or "")
        if not hero_id:
            continue

        champ = wr_champs.get(hero_id, {"hero_id": hero_id, "name": f"Hero {hero_id}", "icon": "", "lanes": "Unknown"})

        # Tencent liefert teils 0.443927 oder "44.39" etc -> wir normalisieren auf Prozent
        def as_percent(val):
            if val is None:
                return None
            try:
                f = float(val)
                # wenn 0.xx -> als *100
                if f <= 1.0:
                    return round(f * 100.0, 2)
                return round(f, 2)
            except Exception:
                return None

        win = as_percent(row.get("win_rate") or row.get("win_rate_percent") or row.get("win_rate_float"))
        pick = as_percent(row.get("appear_rate") or row.get("appear_rate_percent") or row.get("appear_rate_float"))
        ban = as_percent(row.get("forbid_rate") or row.get("forbid_rate_percent") or row.get("forbid_rate_float"))

        champions.append(
            {
                "hero_id": champ["hero_id"],
                "name": champ["name"],
                "icon": champ["icon"],
                "lanes": champ.get("lanes", "Unknown"),
                "stats": {
                    "CN": {"win": win, "pick": pick, "ban": ban},
                },
            }
        )

    meta = {
        "patch": "CN Live",
        "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "source": "Tencent: hero_list.js (WR roster/icons) + hero_rank_list_v2 (CN stats)",
        "champions": champions,
    }
    return meta


def main():
    # 1) Roster/Icon/Lane map aus hero_list.js
    hero_js = fetch_text(HERO_LIST_JS_URL)
    hero_list_json = parse_hero_list_js(hero_js)
    wr_champs = build_wr_champions(hero_list_json)

    # 2) Stats aus hero_rank_list_v2
    rank_data = fetch_json(RANK_URL)

    # 3) meta.json bauen
    meta = build_meta(rank_data, wr_champs)

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"OK: meta.json written with {len(meta['champions'])} champs")


if __name__ == "__main__":
    main()