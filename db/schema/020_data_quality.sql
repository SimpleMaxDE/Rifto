-- Data quality tables and checks for ETL monitoring

CREATE TABLE IF NOT EXISTS dq_check_results (
    dq_check_id                  BIGSERIAL PRIMARY KEY,
    check_name                   TEXT NOT NULL,
    check_scope                  TEXT NOT NULL,
    check_severity               TEXT NOT NULL CHECK (check_severity IN ('INFO', 'WARN', 'ERROR')),
    check_status                 TEXT NOT NULL CHECK (check_status IN ('PASS', 'FAIL')),
    affected_rows                INTEGER NOT NULL DEFAULT 0,
    details                      JSONB,
    run_id                       TEXT NOT NULL,
    checked_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dq_results_run
    ON dq_check_results (run_id, check_status, check_severity);

-- Check 1: Missing role assignments in team compositions
CREATE OR REPLACE VIEW dq_missing_roles AS
SELECT
    fm.match_id,
    tc.team_id,
    COUNT(*) FILTER (WHERE tc.role_sk IS NULL) AS missing_role_count
FROM fct_match fm
JOIN fct_team_composition tc ON tc.match_sk = fm.match_sk
GROUP BY fm.match_id, tc.team_id
HAVING COUNT(*) FILTER (WHERE tc.role_sk IS NULL) > 0;

-- Check 2: Duplicate participant assignment for same role/team in a match
CREATE OR REPLACE VIEW dq_duplicate_roles AS
SELECT
    fm.match_id,
    tc.team_id,
    tc.role_sk,
    COUNT(*) AS duplicate_rows
FROM fct_match fm
JOIN fct_team_composition tc ON tc.match_sk = fm.match_sk
GROUP BY fm.match_id, tc.team_id, tc.role_sk
HAVING COUNT(*) > 1;

-- Check 3: Inconsistent IDs between natural keys and surrogate refs
CREATE OR REPLACE VIEW dq_inconsistent_ids AS
SELECT
    fm.match_id,
    fm.patch_sk,
    fm.region_sk,
    CASE WHEN dp.patch_sk IS NULL THEN 'MISSING_PATCH_REF' END AS patch_error,
    CASE WHEN dr.region_sk IS NULL THEN 'MISSING_REGION_REF' END AS region_error
FROM fct_match fm
LEFT JOIN dim_patch dp ON dp.patch_sk = fm.patch_sk
LEFT JOIN dim_region dr ON dr.region_sk = fm.region_sk
WHERE dp.patch_sk IS NULL OR dr.region_sk IS NULL;

-- Check 4: Duplicate match IDs in raw ingest table (if raw table exists)
-- Expected upstream raw table schema: raw_wr_matches(match_id TEXT, ingested_at TIMESTAMPTZ, payload JSONB)
CREATE OR REPLACE VIEW dq_raw_duplicate_match_ids AS
SELECT
    match_id,
    COUNT(*) AS duplicate_count,
    MIN(ingested_at) AS first_seen,
    MAX(ingested_at) AS last_seen
FROM raw_wr_matches
GROUP BY match_id
HAVING COUNT(*) > 1;
