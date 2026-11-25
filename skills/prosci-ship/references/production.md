# Production readiness for a change

A merged diff is not a shipped change. This is the short list that separates the two.

## 1. Observability

- Does the new path have a log line that tells you it ran, without logging secrets or payloads?
- If it can fail, is the failure visible in an existing signal (error log, metric, alert) rather than
  silently swallowed?
- Can you answer "did this work in production" from the data you already collect? If not, add the minimum
  signal in this change, not later.

## 2. Data

- Migration: forward-only, idempotent, and safe to run twice.
- Backfill: bounded batches, resumable, and does not lock the table.
- Rollback: does the old code still read data written by the new code? If not, the deploy needs a two-step
  sequence and the PR must say so.
- Deletion: soft or hard, and whether anything reads the deleted rows.

## 3. Failure and load

- What happens when the dependency is down or slow? Timeout, fallback, or a clear error — pick one and say
  which.
- Retries: idempotency key, bounded attempts, jitter.
- A new query on a hot path: index, expected rows scanned, and what happens at 10×.
- A new queue/worker: poison-message behaviour and dead-letter destination.

## 4. Configuration and secrets

- New config has a default that is safe for an empty environment.
- No secret in code, logs, tests, or error messages.
- Flags: default off for behaviour changes, with the owner and removal condition written down.

## 5. Operability

- Deploy order: can this ship before/after the dependent change? State it.
- Feature flag or no flag, and why.
- Rollback command, and what state it leaves.
- Who is paged if this breaks at 3am, and what should they look at first.

## 6. Before merge

- [ ] proof command from the spec, run and pasted
- [ ] failure path tested
- [ ] migration reversible or a stated two-step
- [ ] logs/metrics for the new path, no secrets
- [ ] deploy order and rollback in the PR
- [ ] known gaps listed, not hidden
