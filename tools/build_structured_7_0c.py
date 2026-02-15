#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = json.loads((ROOT/'data/live_catalog.json').read_text(encoding='utf-8'))
LOC = json.loads((ROOT/'data/localization_en.json').read_text(encoding='utf-8'))
MODELS = json.loads((ROOT/'data/champion_models.json').read_text(encoding='utf-8')).get('champions', {})
TRUTH = json.loads((ROOT/'data/patch_7_0c_truth.json').read_text(encoding='utf-8'))

ITEM_OUT = ROOT/'data/items_7_0c.json'
CHAMP_OUT = ROOT/'data/champions_7_0c.json'

num_re = re.compile(r'-?\d+(?:\.\d+)?')
pct_re = re.compile(r'(-?\d+(?:\.\d+)?)\s*%')
sec_re = re.compile(r'(-?\d+(?:\.\d+)?)\s*(?:s|sec|seconds|秒)\b', re.I)
unit_re = re.compile(r'(-?\d+(?:\.\d+)?)\s*(?:units|unit|码|range)\b', re.I)

STAT_MAP = {
    'hp':'hp','armor':'armor','mr':'mr','ad':'ad','ap':'ap','mana':'mana','ability_haste':'ability_haste',
    'attack_speed':'attack_speed','crit_rate':'crit_chance','move_speed_flat':'move_speed','move_speed_pct':'move_speed_percent',
    'magic_pen_flat':'magic_pen_flat','magic_pen_pct':'magic_pen_percent','armor_pen_flat':'armor_pen_flat','armor_pen_pct':'armor_pen_percent',
    'lifesteal':'lifesteal','spell_vamp':'omnivamp','tenacity':'tenacity','heal_shield_power':'heal_shield_power',
    'hp_regen':'hp_regen','hp_regen_pct':'hp_regen_percent','mana_regen':'mana_regen'
}

TYPE_HINTS = {
    'damage':'damage','heal':'heal','healing':'heal','shield':'shield','modifier':'stat_gain','penetration':'shred',
    'grievous':'antiheal','antiheal':'antiheal','cc':'cc','mobility':'mobility','utility':'utility'
}
TRIGGER_MAP = {
    'onhittarget':'on_hit','onhit':'on_hit','ondamagetaken':'on_damage_taken','onkill':'on_kill','oncast':'on_cast',
    'passive_always':'passive_always','periodic':'periodic'
}

def slug(s):
    t = re.sub(r"[^a-z0-9]+", "-", str(s).strip().lower())
    return re.sub(r'-+', '-', t).strip('-') or 'unknown'

def parse_values(vals):
    flat=[]; pct=[]; sec=[]; units=[]
    for v in vals:
        sv=str(v)
        pct += [float(x) for x in pct_re.findall(sv)]
        sec += [float(x) for x in sec_re.findall(sv)]
        units += [float(x) for x in unit_re.findall(sv)]
        # plain numbers not part of percent
        raw = [float(x) for x in num_re.findall(sv)]
        for n in raw:
            if n not in pct: flat.append(n)
    return flat,pct,sec,units

def effect_type(fx):
    text=' '.join([str(fx.get('name','')), str(fx.get('source_line','')), str(fx.get('effect_type',''))]).lower()
    for k,v in TYPE_HINTS.items():
        if k in text:
            return v
    return 'utility'

def target_scope(fx):
    txt=' '.join([str(fx.get('name','')), str(fx.get('source_line',''))]).lower()
    if 'ally' in txt: return 'ally'
    if 'enemy' in txt or 'target' in txt: return 'enemy'
    if fx.get('flags',{}).get('aoe'): return 'area'
    return 'self'

def cooldown_type(fx):
    cd=fx.get('cooldown')
    if cd is None: return None
    return 'global'

# build items
items=[]
for row in LIVE.get('items',[]):
    name_zh = str(row.get('name','')).strip()
    name_en = LOC.get('items',{}).get(name_zh, name_zh)
    stats_raw = row.get('stats',{}) if isinstance(row.get('stats'),dict) else {}
    stats = {v:0 for v in set(STAT_MAP.values())}
    extras = {}
    for k,val in stats_raw.items():
        n = float(val)/10000 if str(val).strip() else 0
        key = STAT_MAP.get(k)
        if key:
            stats[key] = n
        else:
            extras[k]=n
    effects=[]
    for fx in (row.get('effects') or []):
        vals = fx.get('values') if isinstance(fx.get('values'), list) else ([] if fx.get('values') in (None,'') else [fx.get('values')])
        flat,pct,sec,units = parse_values(vals)
        scaling=[]
        for sc in (fx.get('scaling') or []):
            if not isinstance(sc,dict):
                continue
            scaling.append({
                'scaling_ratio': float(sc.get('ratio')) if str(sc.get('ratio','')).replace('.','',1).isdigit() else None,
                'scaling_stat': sc.get('source')
            })
        limitations=[]
        if 'ranged' in str(fx.get('source_line','')).lower():
            limitations.append({'reduced_for_ranged': True, 'reduced_percent': pct[0] if pct else None})
        eff={
            'effect_id': slug(fx.get('name') or fx.get('source_line') or f"{name_en}-effect"),
            'effect_name': fx.get('name') or None,
            'trigger': TRIGGER_MAP.get(str(fx.get('trigger','')).lower(), str(fx.get('trigger') or 'passive_always')),
            'target_scope': target_scope(fx),
            'effect_type': effect_type(fx),
            'damage_type': fx.get('damage_type') or 'none',
            'values': {
                'flat_values': flat,
                'percent_values': pct,
                'seconds': sec,
                'ranges_units': units,
                'stack_values': [float(x) for x in num_re.findall(str(fx.get('max_stacks','') or ''))]
            },
            'scaling': scaling,
            'cooldown': {
                'cooldown_seconds': fx.get('cooldown') if isinstance(fx.get('cooldown'), (int,float)) else None,
                'cooldown_type': cooldown_type(fx)
            },
            'duration': {
                'duration_seconds': fx.get('duration') if isinstance(fx.get('duration'), (int,float)) else None
            },
            'stacking': {
                'stacks_gain_rule': 'on_hit' if 'onhit' in str(fx.get('trigger','')).lower() else ('periodic' if str(fx.get('trigger','')).lower()=='periodic' else None),
                'max_stacks': fx.get('max_stacks') if isinstance(fx.get('max_stacks'), (int,float)) else None,
                'on_max_stack_bonus': None
            },
            'limitations': {
                'reduced_for_ranged': any(l.get('reduced_for_ranged') for l in limitations),
                'reduced_percent': limitations[0].get('reduced_percent') if limitations else None,
                'diminished_on_repeat': False,
                'diminished_percent': None,
                'min_cap': None,
                'max_cap': None,
                'conditions': fx.get('conditions') if isinstance(fx.get('conditions'), list) else []
            },
            'special_rules': {
                'unique': bool((fx.get('flags') or {}).get('unique')),
                'applies_on_hit': bool((fx.get('flags') or {}).get('applies_on_hit')),
                'can_crit': bool((fx.get('flags') or {}).get('can_crit')),
                'aoe': bool((fx.get('flags') or {}).get('aoe'))
            }
        }
        effects.append(eff)

    item = {
        'item_id': slug(f"{name_en}-{row.get('item_id','')}") if row.get('item_id') else slug(name_en),
        'name': name_en,
        'native_name': name_zh,
        'shop_category': 'boots' if ('靴' in name_zh or 'boots' in name_en.lower()) else ('defense' if (stats.get('armor',0)+stats.get('mr',0)+stats.get('hp',0))>0 and (stats.get('ad',0)+stats.get('ap',0)==0) else ('magic' if stats.get('ap',0)>0 else ('physical' if (stats.get('ad',0)+stats.get('crit_chance',0)+stats.get('attack_speed',0))>0 else 'support'))),
        'tier': 'top' if str(row.get('into') or '').strip()=='' else 'mid',
        'total_cost': int(float(row.get('price') or 0)),
        'patch_version': '7.0C',
        'stats': stats,
        'extra_stats': extras,
        'effects': effects,
        'build_path': {
            'from': row.get('from') if isinstance(row.get('from'), list) else [],
            'into': row.get('into') if isinstance(row.get('into'), list) else ([row.get('into')] if row.get('into') else [])
        },
        'icon': row.get('icon')
    }
    items.append(item)

# champions
truth_by_name={c.get('name'):c for c in TRUTH.get('champions',[])}
live_champs = LIVE.get('champions',[])
loc_items=LOC.get('items',{})

role_map = {
    '战士':'fighter','坦克':'tank','法师':'mage','刺客':'assassin','射手':'marksman','辅助':'support'
}
lane_map = {'单人路':'baron','打野':'jungle','中路':'mid','双人路':'dragon','辅助':'support'}

def normalize_abilities(ch):
    out=[]
    if isinstance(ch.get('passive'),dict):
        p=ch['passive']
        out.append({'slot':'P','name':p.get('name','Passive'),'damage_type':'none','base_damage':[], 'ratios':[], 'cooldowns':[], 'cc_durations':[], 'shield_heal_values':[], 'sustain_flags':[], 'keywords':[]})
    for ab in ch.get('abilities') or []:
        desc=str(ab.get('description','')).lower()
        out.append({
            'slot':ab.get('slot'),
            'name':ab.get('name'),
            'damage_type':ab.get('damage_type') or 'none',
            'base_damage':[float(x) for x in num_re.findall(str(ab.get('base_damage','')))][:5],
            'ratios':ab.get('ratios') if isinstance(ab.get('ratios'),list) else [],
            'cooldowns':[float(x) for x in (ab.get('cooldown') or []) if str(x).replace('.','',1).isdigit()],
            'cc_durations':[float(ab.get('cc_duration'))] if isinstance(ab.get('cc_duration'), (int,float)) else [],
            'shield_heal_values':[float(x) for x in num_re.findall(desc) if ('shield' in desc or 'heal' in desc)][:4],
            'sustain_flags':[k for k in ['heal','shield','regen','lifesteal'] if k in desc],
            'keywords':[k for k in ['burst','dps','tank','sustain','cc'] if k in (' '.join(ch.get('keywords') or []).lower() + ' ' + desc)]
        })
    return out

champions=[]
for name, model in MODELS.items():
    live = next((x for x in live_champs if LOC.get('champions',{}).get(x.get('name',''), x.get('name','')) == name or x.get('alias','').lower()==model.get('id','').lower()), None)
    truth = truth_by_name.get(name,{})
    lanes = set()
    roles = set()
    if live:
        if live.get('lane'): lanes.add(lane_map.get(live['lane'], slug(live['lane'])))
        for r in live.get('roles') or []: roles.add(role_map.get(r, slug(r)))
    for l in truth.get('lanes_detected_by_text') or []: lanes.add(slug(l))
    for r in truth.get('roles_detected_by_text') or []: roles.add(slug(r))
    stats = model.get('stats',{})
    champions.append({
        'champion_id': slug(model.get('id') or name),
        'name': name,
        'lane_flags': {k:(k in lanes) for k in ['baron','jungle','mid','dragon','support']},
        'role_flags': sorted(roles),
        'ratings': {
            'damage': 0,
            'toughness': 0,
            'utility': 0,
            'difficulty': 0
        },
        'base_stats': {
            'hp': float(stats.get('hp',0)),
            'hp_per_level': float(stats.get('hp_per_level',0)),
            'armor': float(stats.get('armor',0)),
            'armor_per_level': float(stats.get('armor_per_level',0)),
            'mr': float(stats.get('mr',0)),
            'mr_per_level': float(stats.get('mr_per_level',0)),
            'ad': float(stats.get('ad',0)),
            'ad_per_level': float(stats.get('ad_per_level',0)),
            'ap': float(stats.get('ap',0)),
            'as': float(stats.get('attack_speed',0)),
            'as_per_level': float(stats.get('attack_speed_per_level',0)),
            'move_speed': float(stats.get('move_speed',0))
        },
        'abilities': normalize_abilities(model),
        'keywords': model.get('keywords') or []
    })

ITEM_OUT.write_text(json.dumps({'patch_version':'7.0C','items':items}, ensure_ascii=False, indent=2), encoding='utf-8')
CHAMP_OUT.write_text(json.dumps({'patch_version':'7.0C','champions':champions}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {ITEM_OUT} ({len(items)})')
print(f'Wrote {CHAMP_OUT} ({len(champions)})')
