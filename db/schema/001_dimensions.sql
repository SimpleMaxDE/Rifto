-- Dimensions for Wild Rift analytics warehouse

CREATE TABLE IF NOT EXISTS dim_patch (
    patch_sk            BIGSERIAL PRIMARY KEY,
    patch_version       TEXT NOT NULL UNIQUE,
    release_at          TIMESTAMPTZ NOT NULL,
    sunset_at           TIMESTAMPTZ,
    is_current          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_region (
    region_sk           SMALLSERIAL PRIMARY KEY,
    region_code         TEXT NOT NULL UNIQUE, -- Wild Rift routing shard, SEA
    macro_region        TEXT NOT NULL,        -- Wild Rift routing shard
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_elo_segment (
    elo_segment_sk      SMALLSERIAL PRIMARY KEY,
    elo_segment_code    TEXT NOT NULL UNIQUE, -- e.g. IRON-BRONZE, SILVER-GOLD, PLATINUM-EMERALD, DIAMOND+
    mmr_min             INTEGER,
    mmr_max             INTEGER,
    rank_min            TEXT,
    rank_max            TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_role (
    role_sk             SMALLSERIAL PRIMARY KEY,
    role_code           TEXT NOT NULL UNIQUE, -- TOP, JUNGLE, MID, ADC, SUPPORT
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_champion (
    champion_sk         INTEGER PRIMARY KEY,
    champion_id         INTEGER NOT NULL UNIQUE,
    champion_key        TEXT NOT NULL UNIQUE,
    champion_name       TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dim_time_window (
    window_sk           SMALLSERIAL PRIMARY KEY,
    window_days         SMALLINT NOT NULL UNIQUE CHECK (window_days IN (7, 14, 30)),
    window_name         TEXT NOT NULL UNIQUE
);

INSERT INTO dim_time_window (window_days, window_name)
VALUES (7, 'LAST_7_DAYS'), (14, 'LAST_14_DAYS'), (30, 'LAST_30_DAYS')
ON CONFLICT (window_days) DO NOTHING;
