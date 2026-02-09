import json, re
from datetime import datetime, timezone
import requests

CHAMP_LIST_URL = "https://wildrift.leagueoflegends.com/en-us/champions/"
WRSTATS_URL = "https://wrstats.online/"
DD_VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json"
DD_CHAMPS = "https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json"

UA = "RIFTO-PWA/3.0 (personal use)"

def get_ddragon_version():
    try:
        r = requests.get(DD_VERSIONS, timeout=30, headers={"User-Agent": UA})
        r.raise_for_status()
        versions = r.json()
        return versions[0] if versions else "14.1.1"
    except Exception:
        return "14.1.1"

def get_ddragon_key_map(v):
    try:
        r = requests.get(DD_CHAMPS.format(v=v), timeout=30, headers={"User-Agent": UA})
        r.raise_for_status()
        data = r.json()["data"]
        m = { entry["name"]: entry["id"] for entry in data.values() }
        # common aliases
        m.setdefault("Wukong", "MonkeyKing")
        m.setdefault("Cho'Gath", "Chogath")
        m.setdefault("Kai'Sa", "Kaisa")
        m.setdefault("Kha'Zix", "Khazix")
        m.setdefault("Vel'Koz", "Velkoz")
        m.setdefault("LeBlanc", "Leblanc")
        m.setdefault("Rek'Sai", "RekSai")
        m.setdefault("Dr. Mundo", "DrMundo")
        m.setdefault("Nunu & Willump", "Nunu")
        return m
    except Exception:
        return {}

def fetch(url):
    r = requests.get(url, timeout=45, headers={"User-Agent": UA})
    r.raise_for_status()
    return r.text

def parse_wr_champion_list(html: str):
    text = re.sub(r"\s+", " ", html)
    tokens = re.findall(r"\b[A-Z][A-Z'&\.\s-]{2,}\b", text)
    noise = {
        "CHAMPION","CHAMPIONS","SELECT YOUR","FIND YOUR CHAMP","VIEW ALL CHAMPIONS",
        "LEAGUE OF LEGENDS","WILD RIFT","WITH OVER","TO COLLECT AND PLAY","YOU CAN FIND YOUR FAVORITES",
        "SHOW OFF YOUR STYLE","NEWS","GAME UPDATES","PRIVACY","TERMS","COOKIE","WORK WITH US","PLAY NOW",
        "DETAILS ABOUT THIS CHAMP","SHARE WITH A FRIEND","START AGAIN"
    }
    cleaned=[]
    for t in tokens:
        t=t.strip()
        if t in noise:
            continue
        if len(t) > 22 and " " in t:
            continue
        t = re.sub(r"\s{2,}", " ", t)
        cleaned.append(t)

    seen=set()
    champs=[]
    for t in cleaned:
        if t in seen:
            continue
        seen.add(t)
        champs.append(t)

    out=[]
    for n in champs:
        if n == "DR. MUNDO":
            out.append("Dr. Mundo")
        elif n == "NUNU & WILLUMP":
            out.append("Nunu & Willump")
        elif n == "AURELION SOL":
            out.append("Aurelion Sol")
        else:
            out.append(n.title().replace("'S", "'s"))
    return out

def parse_last_updated_wrstats(html: str):
    m = re.search(r"Last Updated:\s*([^<\n]+)", html)
    return m.group(1).strip() if m else datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

def parse_wrstats_dia(html: str):
    t = re.sub(r"\s+", " ", html)
    pattern = re.compile(
        r"Image:\s*([A-Za-zÀ-ÖØ-öø-ÿ'’&\-\.\s]+?)\s+[A-Za-z]+\s+Build\s+Counters\s+★\s*(Top|Jungle|Mid|Bot|Support)\s+Win:\s*([\d.]+)%\s+Pick:\s*([\d.]+)%\s+Ban:\s*([\d.]+)%",
        re.IGNORECASE
    )
    pos_map = {"Top":"TOP","Jungle":"JUNGLE","Mid":"MID","Bot":"BOT","Support":"SUPPORT"}
    stats={}
    for name, pos, win, pick, ban in pattern.findall(t):
        name=name.strip()
        pkey = pos_map.get(pos.capitalize(), "TOP")
        stats[name] = {"positions":[pkey], "DIA":{"win": float(win), "pick": float(pick), "ban": float(ban)}}
    return stats

def main():
    champ_html = fetch(CHAMP_LIST_URL)
    wr_champs = parse_wr_champion_list(champ_html)

    wrstats_html = fetch(WRSTATS_URL)
    last = parse_last_updated_wrstats(wrstats_html)
    dia_stats = parse_wrstats_dia(wrstats_html)

    dver = get_ddragon_version()
    key_map = get_ddragon_key_map(dver)

    champions=[]
    for name in wr_champs:
        iconKey = key_map.get(name, name.replace(" ", "").replace(".", ""))
        champions.append({
            "name": name,
            "iconKey": iconKey,
            "positions": dia_stats.get(name, {}).get("positions", []),
            "stats": {"DIA": dia_stats.get(name, {}).get("DIA", None)}
        })

    out = {
        "patch": "7.0b",
        "lastUpdated": last,
        "source": "wrstats.online (CN) + Riot Champion List",
        "ddragonVersion": dver,
        "champions": champions
    }
    with open("meta.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
