"""Ban recommendation engine with weighted multi-feature scoring.

The engine combines:
1) Enemy main-rate + champion win-rate
2) Matchup risk against planned own picks
3) Patch dependent meta strength
4) Team composition synergy/anti-synergy
5) Confidence score with low-data handling
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Sequence


@dataclass(frozen=True)
class EnemyChampionProfile:
    champion: str
    main_rate: float = 0.0  # [0..1]
    win_rate: float = 0.5  # [0..1]
    sample_size: int = 0


@dataclass(frozen=True)
class BanRequest:
    enemy_pool: Sequence[EnemyChampionProfile]
    planned_own_picks: Sequence[str] = field(default_factory=list)
    own_team_tags: Sequence[str] = field(default_factory=list)
    enemy_team_tags: Sequence[str] = field(default_factory=list)
    patch: str = "unknown"

    # Feature maps
    matchup_risk: Dict[str, Dict[str, float]] = field(default_factory=dict)
    meta_strength: Dict[str, Dict[str, float]] = field(default_factory=dict)
    synergy_matrix: Dict[str, Dict[str, float]] = field(default_factory=dict)


@dataclass(frozen=True)
class BanExplanation:
    champion: str
    why: str
    risk_indicator: str
    weighted_score: float
    confidence: float


@dataclass(frozen=True)
class BanRecommendationResponse:
    patch: str
    top_bans: List[str]
    explanations: List[BanExplanation]
    data_sources: Dict[str, str]


DEFAULT_WEIGHTS = {
    "enemy_mastery": 0.30,
    "matchup_risk": 0.25,
    "meta_strength": 0.20,
    "comp_risk": 0.15,
    "confidence": 0.10,
}


DEFAULT_DATA_SOURCES = {
    "enemy_mastery": "fct_pick_ban + fct_match (Spielerhistorie: Mainrate/Winrate je Champion)",
    "matchup_risk": "agg_matchup_stats_window oder fct_matchup_stats_daily (Champion-vs-Champion)",
    "meta_strength": "patch-spezifische Aggregation aus fct_match/fct_pick_ban oder fallback meta.json",
    "comp_risk": "fct_team_composition (Synergie/Antisynergie aus Team-Kompositionen)",
    "confidence": "Sample-Size aus den jeweils genutzten Aggregaten",
}


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _enemy_mastery_score(main_rate: float, win_rate: float) -> float:
    # main-rate is already [0..1], win-rate normalized around neutral 50%
    win_norm = _clamp01((win_rate - 0.45) / 0.15)
    return _clamp01((0.55 * main_rate) + (0.45 * win_norm))


def _matchup_risk_score(
    champion: str,
    planned_own_picks: Sequence[str],
    matchup_risk: Dict[str, Dict[str, float]],
) -> float:
    if not planned_own_picks:
        return 0.5

    risks = []
    c_map = matchup_risk.get(champion, {})
    for own_pick in planned_own_picks:
        risk = c_map.get(own_pick)
        if risk is not None:
            risks.append(_clamp01(risk))
    if not risks:
        return 0.5

    # emphasize worst case but keep mean influence
    worst = max(risks)
    mean = sum(risks) / len(risks)
    return _clamp01((0.65 * worst) + (0.35 * mean))


def _meta_strength_score(
    champion: str,
    patch: str,
    meta_strength: Dict[str, Dict[str, float]],
) -> float:
    patch_strength = meta_strength.get(patch) or meta_strength.get("default") or {}
    return _clamp01(patch_strength.get(champion, 0.5))


def _comp_risk_score(
    champion: str,
    own_team_tags: Sequence[str],
    enemy_team_tags: Sequence[str],
    synergy_matrix: Dict[str, Dict[str, float]],
) -> float:
    champ_effects = synergy_matrix.get(champion, {})
    if not champ_effects:
        return 0.5

    anti_values = [_clamp01(champ_effects.get(tag, 0.5)) for tag in own_team_tags]
    synergy_values = [_clamp01(champ_effects.get(tag, 0.5)) for tag in enemy_team_tags]

    anti = sum(anti_values) / len(anti_values) if anti_values else 0.5
    synergy = sum(synergy_values) / len(synergy_values) if synergy_values else 0.5

    return _clamp01((0.6 * anti) + (0.4 * synergy))


def _confidence_score(sample_size: int) -> float:
    # low data => low confidence
    if sample_size <= 0:
        return 0.10
    if sample_size < 10:
        return 0.30
    if sample_size < 25:
        return 0.55
    if sample_size < 50:
        return 0.75
    return 1.00


def _risk_label(weighted_score: float, confidence: float) -> str:
    adjusted = weighted_score * (0.7 + 0.3 * confidence)
    if adjusted >= 0.72:
        return "HIGH"
    if adjusted >= 0.52:
        return "MEDIUM"
    return "LOW"


def _build_why(
    champion: str,
    enemy_mastery: float,
    matchup_risk: float,
    meta_strength: float,
    comp_risk: float,
    confidence: float,
) -> str:
    reasons: List[str] = []
    if enemy_mastery >= 0.65:
        reasons.append("gegnerischer Main mit starker Winrate")
    if matchup_risk >= 0.65:
        reasons.append("ungünstiges Matchup gegen geplante Picks")
    if meta_strength >= 0.65:
        reasons.append("aktuell im Patch sehr stark")
    if comp_risk >= 0.65:
        reasons.append("passt gefährlich gut in die Enemy-Komposition")
    if confidence < 0.55:
        reasons.append("geringe Datenlage (niedrige Confidence)")

    if not reasons:
        reasons.append("solider Allround-Ban basierend auf kombiniertem Risiko")

    return f"{champion}: " + "; ".join(reasons)


def recommend_bans(
    request: BanRequest,
    top_k: int = 3,
    weights: Dict[str, float] | None = None,
    data_sources: Dict[str, str] | None = None,
) -> BanRecommendationResponse:
    """Return weighted top-k ban recommendations incl. explanations[]."""

    w = dict(DEFAULT_WEIGHTS)
    if weights:
        w.update(weights)

    scored: List[BanExplanation] = []
    for profile in request.enemy_pool:
        enemy_mastery = _enemy_mastery_score(profile.main_rate, profile.win_rate)
        matchup = _matchup_risk_score(
            profile.champion,
            request.planned_own_picks,
            request.matchup_risk,
        )
        meta = _meta_strength_score(profile.champion, request.patch, request.meta_strength)
        comp = _comp_risk_score(
            profile.champion,
            request.own_team_tags,
            request.enemy_team_tags,
            request.synergy_matrix,
        )
        confidence = _confidence_score(profile.sample_size)

        weighted_score = (
            (w["enemy_mastery"] * enemy_mastery)
            + (w["matchup_risk"] * matchup)
            + (w["meta_strength"] * meta)
            + (w["comp_risk"] * comp)
            + (w["confidence"] * confidence)
        )

        scored.append(
            BanExplanation(
                champion=profile.champion,
                why=_build_why(
                    profile.champion,
                    enemy_mastery,
                    matchup,
                    meta,
                    comp,
                    confidence,
                ),
                risk_indicator=_risk_label(weighted_score, confidence),
                weighted_score=round(weighted_score, 4),
                confidence=round(confidence, 4),
            )
        )

    scored.sort(key=lambda item: item.weighted_score, reverse=True)
    top = scored[: max(1, top_k)]

    return BanRecommendationResponse(
        patch=request.patch,
        top_bans=[item.champion for item in top],
        explanations=top,
        data_sources=data_sources or dict(DEFAULT_DATA_SOURCES),
    )
