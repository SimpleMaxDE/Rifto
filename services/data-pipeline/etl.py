"""ETL orchestrator for match analytics.

Supports:
- Daily backfills for last N days.
- Incremental updates from watermark with overlap.
- Data quality checks for missing roles, duplicates and inconsistent IDs.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import uuid
from dataclasses import dataclass

import psycopg


@dataclass
class PipelineConfig:
    warehouse_dsn: str
    mode: str
    lookback_days: int = 30
    overlap_hours: int = 2


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _run_sql(cur: psycopg.Cursor, sql_path: str) -> None:
    with open(sql_path, "r", encoding="utf-8") as f:
        cur.execute(f.read())


def ensure_schema(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        _run_sql(cur, "db/schema/001_dimensions.sql")
        _run_sql(cur, "db/schema/010_facts.sql")
        _run_sql(cur, "db/schema/020_data_quality.sql")
    conn.commit()


def get_watermark(conn: psycopg.Connection) -> dt.datetime:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS etl_watermark (
                pipeline_name TEXT PRIMARY KEY,
                watermark_ts TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        cur.execute(
            "SELECT watermark_ts FROM etl_watermark WHERE pipeline_name = %s",
            ("wildrift-analytics-etl",),
        )
        row = cur.fetchone()
    conn.commit()
    if row:
        return row[0]
    return _utcnow() - dt.timedelta(days=1)


def set_watermark(conn: psycopg.Connection, watermark: dt.datetime) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO etl_watermark (pipeline_name, watermark_ts)
            VALUES (%s, %s)
            ON CONFLICT (pipeline_name)
            DO UPDATE SET watermark_ts = EXCLUDED.watermark_ts, updated_at = NOW();
            """,
            ("wildrift-analytics-etl", watermark),
        )
    conn.commit()


def extract_window(config: PipelineConfig, conn: psycopg.Connection) -> tuple[dt.datetime, dt.datetime]:
    end_ts = _utcnow()
    if config.mode == "backfill":
        start_ts = end_ts - dt.timedelta(days=config.lookback_days)
    else:
        last_wm = get_watermark(conn)
        start_ts = last_wm - dt.timedelta(hours=config.overlap_hours)
    return (start_ts, end_ts)


def transform_and_load(conn: psycopg.Connection, start_ts: dt.datetime, end_ts: dt.datetime) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            -- Example merge from raw_wr_matches into fct_match (expects parsed staging available)
            INSERT INTO fct_match (
                match_id, platform_game_id, game_creation_at, game_start_at, game_end_at,
                game_duration_seconds, queue_id, map_id, mode_id, app_version, patch_sk, region_sk,
                elo_segment_sk, winning_team_id
            )
            SELECT
                rm.match_id,
                (rm.payload->>'gameId')::BIGINT,
                (rm.payload->>'gameCreation')::BIGINT / 1000 * interval '1 second' + TIMESTAMP 'epoch',
                (rm.payload->>'gameStartTimestamp')::BIGINT / 1000 * interval '1 second' + TIMESTAMP 'epoch',
                (rm.payload->>'gameEndTimestamp')::BIGINT / 1000 * interval '1 second' + TIMESTAMP 'epoch',
                (rm.payload->>'gameDuration')::INTEGER,
                (rm.payload->>'queueId')::INTEGER,
                (rm.payload->>'mapId')::INTEGER,
                (rm.payload->>'modeId')::INTEGER,
                rm.payload->>'appVersion',
                dp.patch_sk,
                dr.region_sk,
                de.elo_segment_sk,
                (rm.payload->'teams'->0->>'win')::BOOLEAN::INT * 100 +
                (rm.payload->'teams'->1->>'win')::BOOLEAN::INT * 200
            FROM raw_wr_matches rm
            JOIN dim_patch dp ON dp.patch_version = split_part(rm.payload->>'appVersion', '.', 1) || '.' || split_part(rm.payload->>'appVersion', '.', 2)
            JOIN dim_region dr ON dr.region_code = rm.region_code
            LEFT JOIN dim_elo_segment de ON de.elo_segment_code = rm.elo_segment_code
            WHERE rm.ingested_at >= %s AND rm.ingested_at < %s
            ON CONFLICT (match_id)
            DO UPDATE SET
                game_end_at = EXCLUDED.game_end_at,
                game_duration_seconds = EXCLUDED.game_duration_seconds,
                patch_sk = EXCLUDED.patch_sk,
                elo_segment_sk = EXCLUDED.elo_segment_sk,
                updated_at = NOW();
            """,
            (start_ts, end_ts),
        )

        _run_sql(cur, "services/data-pipeline/sql/recompute_matchup_daily.sql")
        _run_sql(cur, "services/data-pipeline/sql/recompute_rolling_windows.sql")

    conn.commit()


def run_data_quality_checks(conn: psycopg.Connection, run_id: str) -> None:
    checks = [
        ("missing_roles", "dq_missing_roles", "ERROR"),
        ("duplicate_roles", "dq_duplicate_roles", "ERROR"),
        ("inconsistent_ids", "dq_inconsistent_ids", "ERROR"),
        ("raw_duplicate_match_ids", "dq_raw_duplicate_match_ids", "WARN"),
    ]
    with conn.cursor() as cur:
        for check_name, view_name, severity in checks:
            cur.execute(f"SELECT COUNT(*) FROM {view_name}")
            affected_rows = cur.fetchone()[0]
            status = "FAIL" if affected_rows > 0 else "PASS"
            cur.execute(
                """
                INSERT INTO dq_check_results
                    (check_name, check_scope, check_severity, check_status, affected_rows, details, run_id)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (
                    check_name,
                    "warehouse",
                    severity,
                    status,
                    affected_rows,
                    json.dumps({"source_view": view_name}),
                    run_id,
                ),
            )
    conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["backfill", "incremental"], required=True)
    parser.add_argument("--lookback-days", type=int, default=30)
    parser.add_argument("--overlap-hours", type=int, default=2)
    args = parser.parse_args()

    cfg = PipelineConfig(
        warehouse_dsn=os.environ["WAREHOUSE_DSN"],
        mode=args.mode,
        lookback_days=args.lookback_days,
        overlap_hours=args.overlap_hours,
    )

    run_id = str(uuid.uuid4())
    with psycopg.connect(cfg.warehouse_dsn) as conn:
        ensure_schema(conn)
        start_ts, end_ts = extract_window(cfg, conn)
        transform_and_load(conn, start_ts, end_ts)
        run_data_quality_checks(conn, run_id)
        set_watermark(conn, end_ts)


if __name__ == "__main__":
    main()
