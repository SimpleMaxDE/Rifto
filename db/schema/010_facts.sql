-- Core fact tables for match history, picks/bans, team comps and matchups

CREATE TABLE IF NOT EXISTS fct_match (
    match_sk                    BIGSERIAL PRIMARY KEY,
    match_id                    TEXT NOT NULL UNIQUE,
    platform_game_id            BIGINT,
    game_creation_at            TIMESTAMPTZ NOT NULL,
    game_start_at               TIMESTAMPTZ,
    game_end_at                 TIMESTAMPTZ,
    game_duration_seconds       INTEGER NOT NULL,
    queue_id                    INTEGER,
    map_id                      INTEGER,
    mode_id                     INTEGER,
    app_version                 TEXT,
    patch_sk                    BIGINT NOT NULL REFERENCES dim_patch(patch_sk),
    region_sk                   SMALLINT NOT NULL REFERENCES dim_region(region_sk),
    elo_segment_sk              SMALLINT REFERENCES dim_elo_segment(elo_segment_sk),
    winning_team_id             SMALLINT NOT NULL CHECK (winning_team_id IN (100, 200)),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fct_match_patch_region_elo
    ON fct_match (patch_sk, region_sk, elo_segment_sk, game_creation_at DESC);

CREATE TABLE IF NOT EXISTS fct_pick_ban (
    match_sk                    BIGINT NOT NULL REFERENCES fct_match(match_sk) ON DELETE CASCADE,
    team_id                     SMALLINT NOT NULL CHECK (team_id IN (100, 200)),
    turn_number                 SMALLINT,
    action_type                 TEXT NOT NULL CHECK (action_type IN ('PICK', 'BAN')),
    champion_sk                 INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    role_sk                     SMALLINT REFERENCES dim_role(role_sk),
    participant_puuid           TEXT,
    is_locked                   BOOLEAN,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_sk, team_id, action_type, turn_number, champion_sk)
);

CREATE INDEX IF NOT EXISTS idx_fct_pick_ban_champion_role
    ON fct_pick_ban (champion_sk, role_sk, action_type);

CREATE TABLE IF NOT EXISTS fct_team_composition (
    match_sk                    BIGINT NOT NULL REFERENCES fct_match(match_sk) ON DELETE CASCADE,
    team_id                     SMALLINT NOT NULL CHECK (team_id IN (100, 200)),
    role_sk                     SMALLINT NOT NULL REFERENCES dim_role(role_sk),
    champion_sk                 INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    participant_puuid           TEXT,
    kills                       SMALLINT,
    deaths                      SMALLINT,
    assists                     SMALLINT,
    gold_earned                 INTEGER,
    damage_to_champions         INTEGER,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_sk, team_id, role_sk)
);

CREATE INDEX IF NOT EXISTS idx_fct_team_comp_champion
    ON fct_team_composition (champion_sk, role_sk);

-- Aggregated matchup stats by champion-vs-champion and role scope
CREATE TABLE IF NOT EXISTS fct_matchup_stats_daily (
    stats_date                  DATE NOT NULL,
    patch_sk                    BIGINT NOT NULL REFERENCES dim_patch(patch_sk),
    region_sk                   SMALLINT NOT NULL REFERENCES dim_region(region_sk),
    elo_segment_sk              SMALLINT REFERENCES dim_elo_segment(elo_segment_sk),
    role_sk                     SMALLINT REFERENCES dim_role(role_sk),
    champion_a_sk               INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    champion_b_sk               INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    games_played                INTEGER NOT NULL,
    wins_a                      INTEGER NOT NULL,
    wins_b                      INTEGER NOT NULL,
    avg_gold_diff_15_a          NUMERIC(10,2),
    avg_cs_diff_15_a            NUMERIC(10,2),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (
        stats_date,
        patch_sk,
        region_sk,
        elo_segment_sk,
        role_sk,
        champion_a_sk,
        champion_b_sk
    ),
    CHECK (champion_a_sk <> champion_b_sk),
    CHECK (games_played >= wins_a + wins_b)
);

CREATE INDEX IF NOT EXISTS idx_matchup_lookup
    ON fct_matchup_stats_daily (patch_sk, region_sk, elo_segment_sk, role_sk, stats_date DESC);

-- Rolling windows for BI-friendly queries (7/14/30 days)
CREATE TABLE IF NOT EXISTS agg_matchup_stats_window (
    as_of_date                  DATE NOT NULL,
    window_sk                   SMALLINT NOT NULL REFERENCES dim_time_window(window_sk),
    patch_sk                    BIGINT NOT NULL REFERENCES dim_patch(patch_sk),
    region_sk                   SMALLINT NOT NULL REFERENCES dim_region(region_sk),
    elo_segment_sk              SMALLINT REFERENCES dim_elo_segment(elo_segment_sk),
    role_sk                     SMALLINT REFERENCES dim_role(role_sk),
    champion_a_sk               INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    champion_b_sk               INTEGER NOT NULL REFERENCES dim_champion(champion_sk),
    games_played                INTEGER NOT NULL,
    wins_a                      INTEGER NOT NULL,
    wins_b                      INTEGER NOT NULL,
    win_rate_a                  NUMERIC(7,4) GENERATED ALWAYS AS (
        CASE WHEN games_played = 0 THEN 0 ELSE wins_a::NUMERIC / games_played END
    ) STORED,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (
        as_of_date,
        window_sk,
        patch_sk,
        region_sk,
        elo_segment_sk,
        role_sk,
        champion_a_sk,
        champion_b_sk
    )
);
