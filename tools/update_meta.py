import json
import requests
from datetime import datetime, timezone

CN_URL = "https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (RIFTO meta updater)",
    "Referer": "https://lolm.qq.com/",
}

def try_fetch_json(url: str, timeout_seconds: int = 8):
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout_seconds)
        return r.status_code, r.text[:5000]  # keep it small for debug
    except Exception as e:
        return None, str(e)

def main():
    now = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    status, snippet = try_fetch_json(CN_URL, timeout_seconds=8)

    meta = {
        "patch": "CN Live",
        "lastUpdated": now,
        "source": "Tencent CN (mlol.qt.qq.com hero_rank_list_v2)",
        "statsByName": {},
        "debug": {
            "tencent_status": status,
            "tencent_snippet": snippet
        }
    }

    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
