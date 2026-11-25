# P1–P3 report: concurrency, request accounting, cancellation

Corrective work under the feature freeze. No paid execution was performed; every claim below is
from deterministic tests. Commands and totals are in the last section.

## P1 — real concurrency

The controller used to execute units one at a time. It now keeps a bounded in-flight set
(`--concurrency`, clamped to the plan's `maxConcurrency`) and starts a unit only when every
dependency has status `succeeded`.

What the tests prove, not just assert:

- **Overlap is real process time.** Four units at concurrency 2 produced interleaved ledger
  windows (`p0` seq 2→5, `p1` seq 4→8). Units are child processes; the overlap is not a label.
- **Ordering holds.** A dependent unit never starts before its predecessor succeeds; a failed
  dependency marks dependents `blocked` without running them.
- **Parallel results are integrated.** Each unit commits in its own worktree and is merged into
  the integration branch under a lock, so concurrent merges cannot interleave; combined
  acceptance still runs after all merges, because disjoint file ownership is not semantic
  independence.
- **Ownership and acceptance still fail the unit**, and retries stay inside the slot.

Advisory: the plan's `maxConcurrency` is a request, the CLI flag is the enforcement; a unit's
claimed files are checked after the fact, not enforced while it runs (the sandbox confines it to
its worktree).

## P2 — request accounting at the proxy boundary

Enforced:

- **Atomic reservation before forwarding.** `bin/lib/request-budget.mjs` increments a shared
  budget file under a lock; the proxy calls it immediately before the upstream fetch. Twenty
  concurrent child processes against a limit of five got exactly five reservations.
- **Aggregate cap across workers.** All workers of an execution share one budget file, set to
  the authorization's remaining allowance. Denial is `429` with `used`/`limit`.
- **Failed attempts spend.** A request that fails after reservation stays spent (502 logged).
  Tests cover closed upstream, denial not consuming, exhaustion, stale-lock reclaim, restart.
- **Reconciliation.** After the run the controller charges `requestsUsed` from the proxy's own
  access log / budget file, not from attempts, and records `requests: { reserved, limit, logged }`.
  A fake run that makes no provider request charges zero — this is the test that separates
  request enforcement from attempt counting.

Single-use authorization is preserved: the execution claim stays persisted, and a second run
under the same record is refused (existing regression).

Advisory, still: token counts and monetary cost are reported, never enforced. Only request
counts, retries, executions and wall clock are gates.

## P3 — cancellation

Enforced:

- Workers spawn as process-group leaders. Deadline, SIGINT and SIGTERM signal the whole group
  (`SIGTERM`, then `SIGKILL`), so descendants die with the worker.
- The pgid is written to evidence at spawn time, before the worker finishes, so cancellation can
  find a hanging tree; orphan checks use that pgid, not process names.
- Terminal states are recorded: `cancelled` with a reason, or `failed` with `unit deadline
  exceeded`. Resume rebuilds the ledger without double-charging requests.

Proven: a worker that hangs for 120 s is killed within ~400 ms of its deadline; `kill(-pgid, 0)`
raises `ESRCH` afterwards; SIGINT during a hang kills the group and leaves no `running` unit.

Advisory: a process that detaches into its own session and re-parents cannot be reached by a
group signal. The bwrap sandbox limits that exposure but does not prove it.

## Arithmetic of the guarantee

| Quantity | Enforced by | Test |
|---|---|---|
| Dependency order | controller scheduler | chain, blocked-dependent, overlap |
| Concurrency bound | in-flight set | cap test, overlap test |
| Requests per execution | proxy reservation file | 20-way race, 429, failed-forward |
| Retries / executions | exec-auth claim | clamp, single-use |
| Cancellation | process group signal | deadline kill, SIGINT, `ESRCH` |
| Tokens / dollars | nothing | reported only |

## Commands

```
node --test bin/test/*.test.mjs          # 93 pass, 0 fail
node --test eval/harness/test/*.test.mjs # 23 pass, 0 fail
node eval/harness/routing.mjs            # 44 scenarios, 0 failures
node eval/harness/fingerprint.mjs --check# 17 skills, 0 drift
node eval/harness/skill-lint.mjs         # 17 skills, references declared
```
