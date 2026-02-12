-- Recompute daily matchup stats for impacted dates.
-- Assumes fct_team_composition and fct_match are loaded.

WITH base AS (
    SELECT
        fm.game_creation_at::date AS stats_date,
        fm.patch_sk,
        fm.region_sk,
        fm.elo_segment_sk,
        tc_blue.role_sk,
        tc_blue.champion_sk AS champion_a_sk,
        tc_red.champion_sk AS champion_b_sk,
        CASE WHEN fm.winning_team_id = 100 THEN 1 ELSE 0 END AS win_a,
        CASE WHEN fm.winning_team_id = 200 THEN 1 ELSE 0 END AS win_b
    FROM fct_match fm
    JOIN fct_team_composition tc_blue
      ON tc_blue.match_sk = fm.match_sk
     AND tc_blue.team_id = 100
    JOIN fct_team_composition tc_red
      ON tc_red.match_sk = fm.match_sk
     AND tc_red.team_id = 200
     AND tc_red.role_sk = tc_blue.role_sk
),
agg AS (
    SELECT
        stats_date,
        patch_sk,
        region_sk,
        elo_segment_sk,
        role_sk,
        champion_a_sk,
        champion_b_sk,
        COUNT(*)::INTEGER AS games_played,
        SUM(win_a)::INTEGER AS wins_a,
        SUM(win_b)::INTEGER AS wins_b
    FROM base
    GROUP BY 1,2,3,4,5,6,7
)
INSERT INTO fct_matchup_stats_daily (
    stats_date,
    patch_sk,
    region_sk,
    elo_segment_sk,
    role_sk,
    champion_a_sk,
    champion_b_sk,
    games_played,
    wins_a,
    wins_b
)
SELECT
    stats_date,
    patch_sk,
    region_sk,
    elo_segment_sk,
    role_sk,
    champion_a_sk,
    champion_b_sk,
    games_played,
    wins_a,
    wins_b
FROM agg
ON CONFLICT (
    stats_date,
    patch_sk,
    region_sk,
    elo_segment_sk,
    role_sk,
    champion_a_sk,
    champion_b_sk
)
DO UPDATE SET
    games_played = EXCLUDED.games_played,
    wins_a = EXCLUDED.wins_a,
    wins_b = EXCLUDED.wins_b,
    updated_at = NOW();
