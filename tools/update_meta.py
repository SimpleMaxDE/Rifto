import json
import os
from datetime import datetime, timezone

import requests


# ✅ RICHTIGE, funktionierende Quellen (ohne .json)
CN_RANK_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"
HERO_LIST_JS_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js"

# File paths (Repo root)
META_PATH = "meta.json"
WR_MAP_PATH = "wr_champions.json"


def fetch_text(url: str, timeout: int = 25) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
        "Referer": "https://mlol.qt.qq.com/",
    }
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.text


def fetch_json(url: str, timeout: int = 25) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
        "Referer": "https://mlol.qt.qq.com/",
    }
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.json()


def extract_json_object_containing(text: str, needle: str) -> str | None:
    """
    Robust: findet das JSON-Objekt, das z.B. '"heroList"' enthält,
    und extrahiert es per Klammer-Zähler (string-safe).
    """
    idx = text.find(needle)
    if idx == -1:
        return None

    # finde die öffnende '{' vor needle
    start = text.rfind("{", 0, idx)
    if start == -1:
        return None

    depth = 0
    in_str = False
    esc = False

    for i in range(start, len(text)):
        ch = text[i]

        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue

        if ch == '"':
            in_str = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return None


def parse_hero_list() -> dict:
    js = fetch_text(HERO_LIST_JS_URL)

    # Versuch 1: direktes JSON-Objekt im JS (oft so)
    blob = extract_json_object_containing(js, '"heroList"')
    if blob:
        try:
            obj = json.loads(blob)
            if isinstance(obj, dict) and "heroList" in obj:
                return obj
        except Exception:
            pass

    # Versuch 2: manche Varianten packen das JSON als String zusammen (head/tail)
    # Wir suchen nach "hero_list_head" / "hero_list_tail" wie du es gesehen hast.
    def find_json_string(key: str) -> str | None:
        k = f'"{key}"'
        p = js.find(k)
        if p == -1:
            return None
        # finde erstes ':' danach
        c = js.find(":", p)
        if c == -1:
            return None
        # finde erstes '"' danach
        q = js.find('"', c)
        if q == -1:
            return None
        # parse bis zum nächsten unescaped '"'
        i = q + 1
        out = []
        esc = False
        while i < len(js):
            ch = js[i]
            if esc:
                out.append(ch)
                esc = False
            else:
                if ch == "\\":
                    esc = True
                elif ch == '"':
                    break
                else:
                    out.append(ch)
            i += 1
        return "".join(out)

    head = find_json_string("hero_list_head")
    tail = find_json_string("hero_list_tail")
    if head and tail:
        candidate = head + tail
        # candidate ist JSON string-escaped, also wieder entschärfen:
        # Erst als JSON-String laden, dann das Ergebnis als JSON parsen.
        try:
            unescaped = json.loads(f'"{candidate}"')
            obj = json.loads(unescaped)
            if isinstance(obj, dict) and "heroList" in obj:
                return obj
        except Exception:
            pass

    raise RuntimeError("Konnte hero_list.js nicht parsen (kein heroList JSON gefunden).")


def load_wr_map() -> dict:
    if not os.path.exists(WR_MAP_PATH):
        return {}
    try:
        with open(WR_MAP_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # akzeptiere dict oder list
        if isinstance(data, dict):
            return data
        if isinstance(data, list):
            # list von objs -> map per hero_id/heroId
            out = {}
            for it in data:
                if not isinstance(it, dict):
                    continue
                hid = str(it.get("hero_id") or it.get("heroId") or it.get("id") or "")
                if hid:
                    out[hid] = it
            return out
    except Exception:
        return {}
    return {}


def fetch_rank_stats() -> dict[str, dict]:
    """
    Liefert map hero_id -> {win,pick,ban}
    Versucht verschiedene Feldnamen, weil Tencent das gern leicht ändert.
    """
    data = fetch_json(CN_RANK_URL)

    # oft: {"data":[...]} oder direkt list
    rows = None
    if isinstance(data, dict):
        rows = data.get("data") or data.get("list") or data.get("result")
    if rows is None and isinstance(data, list):
        rows = data

    if not isinstance(rows, list):
        return {}

    out: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        hid = str(row.get("hero_id") or row.get("heroId") or row.get("id") or "")
        if not hid:
            continue

        # Prozent-Felder kommen teils als Strings
        def to_float(x):
            try:
                return float(x)
            except Exception:
                return None

        win = (
            to_float(row.get("win_rate_percent"))
            or to_float(row.get("win_rate"))
            or to_float(row.get("winrate"))
        )
        pick = (
            to_float(row.get("appear_rate_percent"))
            or to_float(row.get("pick_rate_percent"))
            or to_float(row.get("pick_rate"))
            or to_float(row.get("appear_rate"))
        )
        ban = (
            to_float(row.get("forbid_rate_percent"))
            or to_float(row.get("ban_rate_percent"))
            or to_float(row.get("ban_rate"))
            or to_float(row.get("forbid_rate"))
        )

        # falls Werte 0..1 statt Prozent kommen
        def norm(v):
            if v is None:
                return None
            return v * 100.0 if 0 < v <= 1.0 else v

        out[hid] = {
            "win": round(norm(win) or 0.0, 2),
            "pick": round(norm(pick) or 0.0, 2),
            "ban": round(norm(ban) or 0.0, 2),
        }
    return out


def read_existing_meta() -> dict:
    if not os.path.exists(META_PATH):
        return {}
    try:
        with open(META_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def main():
    now = datetime.now(timezone.utc).astimezone(timezone.utc)
    last_updated = now.strftime("%Y-%m-%d %H:%M")

    existing = read_existing_meta()
    existing_champs = existing.get("champions") if isinstance(existing, dict) else None
    existing_count = len(existing_champs) if isinstance(existing_champs, list) else 0

    # 1) Hero list (Pflicht)
    try:
        hero_obj = parse_hero_list()
        hero_list = hero_obj.get("heroList", {})
        if not isinstance(hero_list, dict):
            hero_list = {}
    except Exception as e:
        # Wenn hero list down ist: NICHT überschreiben
        print(f"[WARN] hero_list.js Fehler: {e}")
        if existing_count >= 50:
            print("[OK] Behalte bestehendes meta.json (kein Überschreiben).")
            return
        raise

    # 2) Rank stats (optional)
    stats = {}
    try:
        stats = fetch_rank_stats()
    except Exception as e:
        print(f"[WARN] Rank stats Fehler (ok, fallback ohne stats): {e}")
        stats = {}

    # 3) Optional English mapping
    wr_map = load_wr_map()

    champions = []
    for hero_id, h in hero_list.items():
        hid = str(h.get("heroId") or hero_id)

        # Name: bevorzugt Englisch aus wr_champions.json
        mapped = wr_map.get(hid, {}) if isinstance(wr_map, dict) else {}
        name = (
            mapped.get("name")
            or mapped.get("en")
            or mapped.get("name_en")
            or mapped.get("english")
            or h.get("alias")  # pinyin fallback
            or h.get("name")   # CN fallback
            or hid
        )

        icon = h.get("avatar") or mapped.get("icon") or ""

        champ = {
            "hero_id": hid,
            "name": name,
            "icon": icon,
            "stats": {
                "CN": stats.get(hid, {"win": 0.0, "pick": 0.0, "ban": 0.0})
            },
        }
        champions.append(champ)

    # ✅ Sicherheits-Gurt: NIE wieder leer schreiben
    if len(champions) < 50:
        print(f"[WARN] Zu wenige Champions ({len(champions)}).")
        if existing_count >= 50:
            print("[OK] Behalte bestehendes meta.json (kein Überschreiben).")
            return
        # wenn es wirklich neu ist und leer wäre -> hart failen
        raise RuntimeError("Champion-Liste zu klein – würde meta.json zerstören.")

    meta = {
        "patch": "CN Live",
        "lastUpdated": last_updated,
        "source": f"Tencent hero_list.js (WR list + icons) + hero_rank_list_v2 (CN stats) | {CN_RANK_URL}",
        "champions": champions,
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"[OK] meta.json geschrieben: {len(champions)} Champions")


if __name__ == "__main__":
    main()