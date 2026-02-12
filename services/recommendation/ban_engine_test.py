from services.recommendation.ban_engine import (
    BanRequest,
    EnemyChampionProfile,
    recommend_bans,
)


def test_recommend_bans_returns_top3_with_explanations():
    request = BanRequest(
        patch="5.0a",
        enemy_pool=[
            EnemyChampionProfile("Kayn", main_rate=0.72, win_rate=0.58, sample_size=80),
            EnemyChampionProfile("Yone", main_rate=0.55, win_rate=0.54, sample_size=35),
            EnemyChampionProfile("Pyke", main_rate=0.44, win_rate=0.52, sample_size=8),
            EnemyChampionProfile("Malphite", main_rate=0.22, win_rate=0.50, sample_size=50),
        ],
        planned_own_picks=["Jinx", "Orianna"],
        own_team_tags=["immobile_backline", "squishy"],
        enemy_team_tags=["engage", "dive"],
        matchup_risk={
            "Kayn": {"Jinx": 0.90, "Orianna": 0.70},
            "Yone": {"Jinx": 0.75, "Orianna": 0.62},
            "Pyke": {"Jinx": 0.66},
            "Malphite": {"Jinx": 0.55},
        },
        meta_strength={
            "5.0a": {"Kayn": 0.85, "Yone": 0.72, "Pyke": 0.60, "Malphite": 0.58}
        },
        synergy_matrix={
            "Kayn": {"immobile_backline": 0.88, "squishy": 0.82, "engage": 0.74, "dive": 0.92},
            "Yone": {"immobile_backline": 0.76, "squishy": 0.74, "engage": 0.66, "dive": 0.84},
            "Pyke": {"immobile_backline": 0.63, "squishy": 0.69, "engage": 0.70, "dive": 0.59},
            "Malphite": {"immobile_backline": 0.52, "squishy": 0.51, "engage": 0.67, "dive": 0.63},
        },
    )

    result = recommend_bans(request)

    assert len(result.top_bans) == 3
    assert result.top_bans[0] == "Kayn"
    assert len(result.explanations) == 3
    assert all(e.why for e in result.explanations)
    assert all(e.risk_indicator in {"LOW", "MEDIUM", "HIGH"} for e in result.explanations)
    assert "enemy_mastery" in result.data_sources


def test_low_sample_size_reduces_confidence():
    request = BanRequest(
        enemy_pool=[
            EnemyChampionProfile("HighData", main_rate=0.45, win_rate=0.50, sample_size=70),
            EnemyChampionProfile("LowData", main_rate=0.45, win_rate=0.50, sample_size=3),
        ],
        meta_strength={"default": {"HighData": 0.5, "LowData": 0.5}},
    )

    result = recommend_bans(request, top_k=2)
    by_name = {item.champion: item for item in result.explanations}

    assert by_name["LowData"].confidence < by_name["HighData"].confidence
