# E2 — one real parallel execution

Authorized under the limits proposed in `docs/plan/e2-parallel-proposal.md`. One execution, consumed.
Evidence is committed under `eval/reports/e2-parallel/` (`eval/runs/` stays gitignored).

## What ran

- Plan `e2-parallel`, hash `68acea5fc4a160a3`, fixture base `317904b`.
- `u1-limit` and `u2-format` are independent implementers; `u3-verify` depends on both.
- Model for every unit: `claude-haiku-5-5`, thinking `low`, reached through `prosci-proxy`.
- Limits: 1 execution, 60 proxy-enforced requests, 1 retry per unit, concurrency 2, 20-minute
  global deadline, 10-minute unit deadline.
- Proxy requests spanned 2026-11-25T23:50:28Z to 23:50:45Z.

## Isolation was proven before execution, not assumed

`evidence/isolation.txt`. The boundary is absence, not file permissions:

- Built-in checks pass: probe credential outside the workspace, `personal-repo/AGENTS.md`,
  `~/.ssh/id_ed25519`, `~/.pi/agent/auth.json` all unreadable; no credential-shaped env vars;
  own PID namespace.
- Extra probes all report **ABSENT** (not "permission denied"): `~/.ssh`, `~/.aws/credentials`,
  `~/.codex/auth.json`, `~/.config/gh/hosts.yml`, `~/.netrc`, host `~/.pi/agent/auth.json`,
  a planted `/home/sumeet/e2-real-auth-probe`, `projects/forge` and `projects/prosci`.
- Positive capability in the same boundary: `git status`, `node --test`, and `pi --version`
  (1.6.1) all work.

The sandbox needed one change to be usable with the managed Pi install: it now mounts
`~/.pi/agent/install` and the `bin/pi` launcher read-only. Credentials remain absent.

## Anti-vacuity proof (before the run)

`evidence/vacuity.txt`, run on copies outside the sandbox:

| Tree | combined test |
|---|---|
| untouched fixture | FAIL |
| u1 change only | FAIL |
| u2 change only | FAIL |
| both changes | PASS |

So the combined check cannot pass by accident, and cannot pass on either unit in isolation.

## Execution

| Unit | Window (seq) | Duration | Worktree | Owned changes | Reported model |
|---|---|---|---|---|---|
| u1-limit | 2→5 | 8,345 ms | `out/worktrees/u1-limit` | `src/limit.mjs`, `test/limit.test.mjs` | `prosci-proxy/claude-haiku-5-5` |
| u2-format | 4→6 | 9,533 ms | `out/worktrees/u2-format` | `src/report.mjs`, `test/format.test.mjs` | `prosci-proxy/claude-haiku-5-5` |
| u3-verify | 8→9 | 10,357 ms | `out/worktrees/u3-verify` | `docs/verification.md` | `prosci-proxy/claude-haiku-5-5` |

u2 started at step 4 while u1 was still running (u1 finished at step 5), so the two workers
genuinely overlapped; u3 started only after both succeeded. Branch SHAs are in
`evidence/shas.txt`: u1 `37e3716b`, u2 `c55b7581`, u3 `f5e49869`. `u3`'s predecessor commits
record both, and its start point is their integration merge.

**Evidence gap, stated rather than papered over:** the ledger records sequence windows and
durations, not wall-clock start/end per unit. The overlap above is exact in ordering and duration
but the overlap duration is derived (≈1.8 s), not directly timestamped. Adding
`startedAtEpoch`/`finishedAtEpoch` to evidence is the fix for the next run.

## Accounting

- Proxy: 11 reservations, 11 forwarded, 0 failed, all `200`. Budget file ends `{limit: 60, used: 11}`.
- Ledger `requests: {reserved: 11, limit: 60, logged: 11}` — the access log and the budget agree.
- Authorization record: `executions 1/1`, `requestsUsed 11`, `maxRequests 60`.
- **First real provider forward through the modified proxy succeeded** (first access line `200`),
  so the reservation path is proven end-to-end, not only in tests.
- Tokens: 11,887 total across the three workers. Estimated cost **$0.001364**, advisory — computed
  from the price table with `totalFromProvider: false`, not provider billing.

## Integration and acceptance

- Ownership: 0 violations. Each unit's changed files equal its declared files.
- `u3-verify` ran the whole suite in the integrated tree: 4 tests, 4 pass, 0 fail
  (`evidence/u3-suite.txt`), including the combined test that requires both changes.
- Controller-owned acceptance: `node --test` and `grep -qi 'pass' docs/verification.md` both passed
  for u3; the two implementers passed their own scoped tests.
- Both implementation diffs survive integration: `integrated.diff` contains the limit change and
  `formatCount`.

## Lifecycle and termination

- Three workers, three process groups (pgids 13, 23, 135 inside the sandbox's PID namespace), all
  reaped by their own exit; nothing was killed by deadline or signal.
- After the run the sandbox exited; no `pi`, controller or fake-worker process survives on the
  host (`pgrep` empty except the proxy, which was then stopped deliberately).
- Final states: 3 succeeded, 0 failed, 0 blocked, 0 cancelled; 3 attempts total, 0 retries used.

## What this does and does not show

- It shows the mechanism works at this scale with a cheap model on a small, unambiguous plan:
  real overlap, correct ordering, exact request accounting, no ownership drift, integrated
  acceptance.
- It does not show behaviour under contention, retries, conflict, or a model that struggles with
  the task. One execution cannot distinguish "works" from "worked once".
- The combined check is a value assertion (`DEFAULT_LIMIT === 5`, `formatCount(5) === "5"`), chosen
  so it fails on either half. It verifies integration, not design quality.
- Cost remains advisory; only requests, retries, executions and deadlines are gates.

## Commands

```
node --test bin/test/*.test.mjs           # 93 pass
node --test eval/harness/test/*.test.mjs  # 24 pass
node eval/harness/routing.mjs             # 44 scenarios, 0 failures
node eval/harness/fingerprint.mjs --check # 17 skills, 0 drift
```
