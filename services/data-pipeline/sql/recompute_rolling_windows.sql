-- Recompute rolling windows for 7/14/30 days using dim_time_window.

WITH windows AS (
    SELECT window_sk, window_days
    FROM dim_time_window
),
base AS (
    SELECT
        CURRENT_DATE AS as_of_date,
        w.window_sk,
        d.patch_sk,
        d.region_sk,
        d.elo_segment_sk,
        d.role_sk,
        d.champion_a_sk,
        d.champion_b_sk,
        SUM(d.games_played)::INTEGER AS games_played,
        SUM(d.wins_a)::INTEGER AS wins_a,
        SUM(d.wins_b)::INTEGER AS wins_b
    FROM fct_matchup_stats_daily d
    JOIN windows w
      ON d.stats_date >= CURRENT_DATE - (w.window_days || ' days')::interval
     AND d.stats_date < CURRENT_DATE + interval '1 day'
    GROUP BY
        CURRENT_DATE,
        w.window_sk,
        d.patch_sk,
        d.region_sk,
        d.elo_segment_sk,
        d.role_sk,
        d.champion_a_sk,
        d.champion_b_sk
)
INSERT INTO agg_matchup_stats_window (
    as_of_date,
    window_sk,
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
    as_of_date,
    window_sk,
    patch_sk,
    region_sk,
    elo_segment_sk,
    role_sk,
    champion_a_sk,
    champion_b_sk,
    games_played,
    wins_a,
    wins_b
FROM base
ON CONFLICT (
    as_of_date,
    window_sk,
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
