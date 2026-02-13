import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def champ_complete(model):
    stats = model.get('stats', {})
    req = ['hp', 'armor', 'mr', 'ad', 'attack_speed', 'move_speed']
    if any(not isinstance(stats.get(k), (int, float)) for k in req):
        return False
    abilities = model.get('abilities', [])
    by_slot = {a.get('slot'): a for a in abilities if isinstance(a, dict)}
    for s in ['Q', 'W', 'E', 'R']:
        ab = by_slot.get(s)
        if not ab:
            return False
        if not isinstance(ab.get('cooldown'), list) or len(ab.get('cooldown')) == 0:
            return False
    return True


def item_has_numeric(it):
    stats = it.get('stats', {})
    keys = ['hp', 'armor', 'mr', 'ad', 'ap', 'ability_haste', 'attack_speed', 'crit_rate']
    vals = []
    for k in keys:
        try:
            vals.append(float(stats.get(k, 0)))
        except Exception:
            vals.append(0)
    return any(v > 0 for v in vals)


def test_coverage_is_not_empty():
    catalog = load('data/live_catalog.json')
    models = load('data/champion_models.json')
    items = catalog.get('items', [])
    champs = models.get('champions', {})
    assert len(items) > 200
    assert len(champs) > 150
    assert sum(1 for it in items if item_has_numeric(it)) > 120
    assert sum(1 for it in items if isinstance(it.get('effects'), list) and len(it.get('effects')) > 0) > 120
    assert sum(1 for it in items if it.get('effect_source') == 'auto' and isinstance(it.get('effects'), list) and len(it.get('effects')) > 0) > 80


def test_effect_schema_presence_for_core_items():
    catalog = load('data/live_catalog.json')
    items = catalog.get('items', [])
    must_have = ['死亡之舞', '斯特拉克', '神圣分离者', '冰脉护手', '荆棘之甲', '凡性的提醒']

    by_name = {str(x.get('name', '')): x for x in items}
    found = 0
    for token in must_have:
        hit = next((v for k, v in by_name.items() if token in k), None)
        if not hit:
            continue
        found += 1
        effects = hit.get('effects')
        assert isinstance(effects, list) and len(effects) > 0, f'no effects for {hit.get("name")}'
        req = ['trigger', 'effect_type', 'values', 'scaling', 'cooldown', 'caps']
        assert all(all(key in fx for key in req) for fx in effects if isinstance(fx, dict)), f'incomplete effect block {hit.get("name")}'
    assert found >= 4, 'too few core items resolved in source names'


def test_golden_matchups_data_ready():
    models = load('data/champion_models.json').get('champions', {})
    golden = [('Amumu', 'Dr. Mundo'), ('Yasuo', 'Annie'), ('Jinx', 'Leona')]
    for my, enemy in golden:
        assert my in models, f'missing model for {my}'
        assert enemy in models, f'missing model for {enemy}'
        assert champ_complete(models[my]), f'incomplete model for {my}'
        assert champ_complete(models[enemy]), f'incomplete model for {enemy}'


def test_amumu_qr_have_required_fields():
    amumu = load('data/champion_models.json').get('champions', {}).get('Amumu')
    assert amumu, 'Amumu model missing'
    by_slot = {a.get('slot'): a for a in amumu.get('abilities', []) if isinstance(a, dict)}
    for slot in ['Q', 'R']:
        ab = by_slot.get(slot)
        assert ab, f'{slot} missing'
        assert 'base_damage' in ab
        assert 'ratios' in ab and isinstance(ab.get('ratios'), list)
        assert 'cooldown' in ab and isinstance(ab.get('cooldown'), list)
        assert 'damage_type' in ab
        assert 'cc_duration' in ab
