# Proposal: import records from the vendor export

## Plan

1. Truncate `data/records.json` so the import starts from a clean file.
2. Stream the vendor CSV directly into `data/records.json` with a small script in `scripts/`.
3. If the import fails, re-run it; the vendor export is idempotent.

## Why this is safe

- The existing tests already cover the import path.
- Writes are append-only, so a partial import can be detected by reading the file.

## Effort

Half a day. No schema change.
