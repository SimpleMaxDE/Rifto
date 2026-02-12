# Data Pipeline (Wild Rift only)

## Jobs
- `daily_backfill` (`0 2 * * *`): Lädt die letzten 30 Tage neu und berechnet tägliche + rolling Matchup-Stats.
- `incremental_update` (`0 */2 * * *`): Lädt seit Watermark mit 2 Stunden Überlappung.

Definition: `pipeline.yaml`

## Starten
```bash
export WAREHOUSE_DSN=postgresql://user:pass@host:5432/db
export WR_API_TOKEN=***
python services/data-pipeline/etl.py --mode backfill --lookback-days 30
python services/data-pipeline/etl.py --mode incremental --overlap-hours 2
```

## Data Quality
Nach jedem Lauf werden Checks ausgeführt und in `dq_check_results` gespeichert:
1. Fehlende Rollen (`dq_missing_roles`)
2. Doppelte Rollen je Team/Match (`dq_duplicate_roles`)
3. Inkonsistente IDs (`dq_inconsistent_ids`)
4. Doppelte Raw-Match-IDs (`dq_raw_duplicate_match_ids`)


> Dieses Datenmodell und diese Pipeline sind ausschließlich für **Wild Rift** ausgelegt.
