#!/usr/bin/env python3
import json, re, sys
from datetime import datetime, timezone
import requests

# Data sources (Tencent CN)
HERO_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"
HERO_LIST_JS  = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"

UA = "Mozilla/5.0 (RIFTO personal project; GitHub Actions)"
HEADERS = {
    "User-Agent": UA,
    "Referer": "https://lolm.qq.com/",
    "Accept": "*/*",
}

def fetch_text(url, timeout=30):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.text

def fetch_json(url, timeout=30):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.json()

def parse_hero_list_js(js_text: str):
    """
    hero_list.js is a JS file that contains a JSON object somewhere inside.
    We extract the largest {...} block and load it as JSON.
    """
    # remove comments
    js_text = re.sub(r"/\*.*?\*/", "", js_text, flags=re.S)
    js_text = re.sub(r"//.*?$", "", js_text, flags=re.M)

    # Try to find a JSON object containing "heroList"
    m = re.search(r"(\{[\s\S]*?\"heroList\"[\s\S]*?\})", js_text)
    if not m:
        # fallback: take the largest {...} block
        blocks = re.findall(r"\{[\s\S]*\}", js_text)
        if not blocks:
            raise ValueError("Could not find JSON in hero_list.js")
        candidate = max(blocks, key=len)
    else:
        candidate = m.group(1)

    # Strip any JS assignment wrappers like "var x = {...};"
    candidate = candidate.strip().rstrip(";")
    return json.loads(candidate)

def normalize_rank_payload(payload):
    # The endpoint sometimes returns {"data":[...]} or a list directly.
    if isinstance(payload, dict):
        for k in ("data", "list", "result"):
            if k in payload and isinstance(payload[k], list):
                return payload[k]
    if isinstance(payload, list):
        return payload
    return []

def pct(x):
    try:
        return float(x)
    except Exception:
        return None

def main():
    # 1) Hero list (names + icons)
    js = fetch_text(HERO_LIST_JS)
    obj = parse_hero_list_js(js)

    hero_map = obj.get("heroList") or obj.get("hero_list") or {}
    # hero_map can be dict keyed by heroId strings
    heroes = {}
    for hid, h in hero_map.items():
        try:
            hero_id = str(h.get("heroId") or hid)
            name = h.get("alias") or h.get("name") or hero_id
            # Prefer Latin alias if available; otherwise keep name (CN)
            display = h.get("alias") or h.get("name") or hero_id
            # Capitalize alias nicely (many aliases are pinyin)
            if display and display.isascii():
                display = display.strip()
                display = display[:1].upper() + display[1:]
            icon = h.get("avatar") or ""
            lane = h.get("lane") or ""
            roles = h.get("roles") or []
            heroes[hero_id] = {
                "hero_id": hero_id,
                "name": display,
                "icon": icon,
                "raw_name": h.get("name"),
                "roles": roles,
                "lane": lane,
            }
        except Exception:
            continue

    # 2) Rank stats (win/pick/ban)
    rank_payload = fetch_json(HERO_RANK_URL)
    rows = normalize_rank_payload(rank_payload)

    # Rows often include: hero_id, win_rate_percent, appear_rate_percent, forbid_rate_percent
    stats_by_id = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        hero_id = str(r.get("hero_id") or r.get("heroId") or r.get("heroid") or "")
        if not hero_id:
            continue
        stats_by_id[hero_id] = {
            "win": pct(r.get("win_rate_percent") or r.get("winrate") or r.get("win_rate") or r.get("win_rate_percent")),
            "pick": pct(r.get("appear_rate_percent") or r.get("pick_rate_percent") or r.get("appear_rate") or r.get("pick")),
            "ban": pct(r.get("forbid_rate_percent") or r.get("ban_rate_percent") or r.get("forbid_rate") or r.get("ban")),
        }

    # 3) Build meta.json
    champions = []
    for hero_id, h in heroes.items():
        s = stats_by_id.get(hero_id)
        if not s:
            continue
        champions.append({
            "hero_id": hero_id,
            "name": h["name"],
            "icon": h["icon"],
            "lane_hint": h.get("lane",""),
            "roles": h.get("roles",[]),
            "stats": {"CN": {"win": s["win"], "pick": s["pick"], "ban": s["ban"]}},
        })

    # Sort by simple metascore: win*0.6 + pick*0.2 + ban*0.2
    def metascore(ch):
        s=ch["stats"]["CN"]
        w=s.get("win") or 0
        p=s.get("pick") or 0
        b=s.get("ban") or 0
        return w*0.6 + p*0.2 + b*0.2
    champions.sort(key=metascore, reverse=True)

    out = {
        "patch": "CN Live",
        "lastUpdated": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M"),
        "source": "Tencent hero_list.js (names+icons) + hero_rank_list_v2 (CN stats)",
        "champions": champions,
    }

    with open("meta.json","w",encoding="utf-8") as f:
        json.dump(out,f,ensure_ascii=False,indent=2)

    print(f"Wrote meta.json with {len(champions)} champions")

if __name__ == "__main__":
    main()
