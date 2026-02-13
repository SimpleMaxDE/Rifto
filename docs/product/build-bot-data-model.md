# Build-Bot Datenmodell (Wild Rift)

## 1) Aktive Datenquellen

- **Tencent Wild Rift Library**
  - Champions: `hero_list.js`
  - Items: `equip.js`
  - Runes: `rune.js`
  - Summoner Spells: `skill.js`
  - Nutzung: Live-Katalog, Item-Stats, Build-Pfade (`from`/`into`), Kosten, Patch-Version.
- **Riot Data Dragon (Champion Full)**
  - `championFull.json` (en_US)
  - Nutzung: Champion Base-Stats + Scaling pro Level, Ability-Cooldowns, Kosten, Reichweiten, Effekt-Tables und Ratios (`vars`).
- **Wild Rift Patch Notes Website**
  - Nutzung: Patch-Erkennung + automatische Change-Extraktion (Champion/Item).

Alle Quellen werden per GitHub Actions zyklisch aktualisiert.

## 2) Item-Schema (Beispiel)

```json
{
  "item_id": "3111",
  "name": "冰霜之心",
  "price": "2700",
  "from": ["1031", "3070"],
  "into": "",
  "tags": "armor,mana,haste",
  "labels": ["defense", "anti_auto"],
  "stats": {
    "hp": 0,
    "armor": 70,
    "mr": 0,
    "ad": 0,
    "ap": 0,
    "ability_haste": 40,
    "attack_speed": 0,
    "crit_rate": 0,
    "armor_pen_flat": 0,
    "armor_pen_pct": 0,
    "magic_pen_flat": 0,
    "magic_pen_pct": 0,
    "move_speed_flat": 0,
    "move_speed_pct": 0,
    "hp_regen": 0,
    "hp_regen_pct": 0,
    "mana": 300,
    "mana_regen": 0,
    "lifesteal": 0,
    "spell_vamp": 0
  }
}
```

## 3) Champion-Schema (Beispiel)

```json
{
  "name": "Ahri",
  "resource": "Mana",
  "stats": {
    "hp": 570,
    "hp_per_level": 104,
    "mp": 418,
    "mp_per_level": 25,
    "armor": 21,
    "armor_per_level": 4.7,
    "mr": 30,
    "mr_per_level": 1.3,
    "ad": 53,
    "ad_per_level": 3,
    "attack_speed": 0.668,
    "attack_speed_per_level": 2,
    "move_speed": 330
  },
  "abilities": [
    {
      "slot": "Q",
      "name": "Orb of Deception",
      "cooldown": [7, 6.5, 6, 5.5, 5],
      "range": [880, 880, 880, 880, 880],
      "damage_effects": [{ "index": 1, "values": "40/65/90/115/140" }],
      "ratios": [{ "key": "a1", "link": "spelldamage", "coeff": [0.45] }]
    }
  ],
  "keywords": ["burst", "cc", "mage"]
}
```
