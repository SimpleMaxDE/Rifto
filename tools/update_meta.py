import json
import requests
from datetime import datetime, timezone

CN_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
    "Referer": "https://lolm.qq.com/",
}

def fetch_json(url: str):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent CN (mlol.qt.qq.com hero_rank_list_v2)",
        "statsByName": {},   # Frontend kann damit arbeiten
        "debug": {}
    }

    try:
        data = fetch_json(CN_URL)
        # Wir speichern erstmal nur Debug-Infos, damit nix mehr crasht.
        # (Stats/Mapping machen wir im nächsten Schritt richtig WR-only.)
        if isinstance(data, dict):
            meta["debug"]["tencent_keys"] = list(data.keys())[:30]
            meta["debug"]["data_type"] = str(type(data.get("data")).__name__)
        else:
            meta["debug"]["data_type"] = str(type(data).__name__)
    except Exception as e:
        meta["debug"]["tencent_error"] = str(e)

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
