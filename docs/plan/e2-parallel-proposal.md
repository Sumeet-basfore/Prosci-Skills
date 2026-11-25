# E2 proposal — parallel execution, revised

Status: proposal only. No paid execution is authorized by this document.

## Question

Does the controller's parallel path (P1) produce *correct integrated work* when two units run at
the same time, and does proxy-boundary accounting (P2) keep the run inside its approved request
budget?

Success is not "two units ran". It is: both units' changes present in the integration tree, the
combined acceptance check passes, the total request count matches the proxy log, and the run
stays under the caps.

## Shape

One plan, two parallel implementers, one dependent verifier, one integrator check.

```
u1-implement (src/limit.mjs)   ─┐
                                ├─→ u3-verify (depends on u1, u2)
u2-implement (src/report.mjs)  ─┘
```

- `u1`: lower `DEFAULT_LIMIT` from 10 to 5 and update its test.
- `u2`: add a `formatCount` helper in a different file with its own test.
- `u3`: run the whole suite plus a combined check that imports both and asserts the lowered limit
  appears in formatted output — a check that fails unless both changes are present.
- Ownership is disjoint (`src/limit.mjs`+test vs `src/report.mjs`+test); the combined check is the
  semantic integration test, not a claim of independence.

## Authorization limits (exact)

| Limit | Value | Enforced by |
|---|---|---|
| executions | 1 (`--max-executions 1`) | claim record, single-use |
| requests | 60 (`--max-requests 60`) | proxy reservation, 429 |
| retries per unit | 1 (`--max-retries 1`) | controller clamp |
| concurrency | 2 (`--concurrency 2`) | in-flight set |
| wall clock | 20 min (`--deadline-min 20`) | scheduler cancel |
| per-unit deadline | 10 min | process-group kill |
| plan approval | hash (`prosci-swarm hash`) | controller refuses otherwise |
| model | `anthropic/claude-haiku-5-5`, thinking `low` | proxy allowlist |
| paid | explicit `--allow-paid` | controller refuses otherwise |

Cost estimate: Phase D ran 3 units, 112 s, 59,284 tokens for $0.0066. This plan is the same size,
so expect **$0.006–0.012**; abort threshold is the 60-request cap, not the dollar figure.

## Sandbox configuration

Same as Phase 0.2, unchanged:

- `bwrap` with read-only `/`, the unit's worktree bound read-write, tmpfs `$HOME`, no host
  credentials visible.
- Scoped `PI_CODING_AGENT_DIR` pointing at a directory containing only `auth.json` (the
  `sandbox-dummy-token`) and `models.json`.
- Network restricted to the loopback proxy; the proxy holds the real key and the only upstream
  (`opencode.ai`), with a model allowlist.
- `PROXY_BUDGET_FILE` and `PROXY_ACCESS_LOG` inside the run directory, so accounting is evidence,
  not console output.

## Integration checks

Controller-run, after the tree is assembled:

1. `node --test` (whole repo) — must pass.
2. Combined check: a new test that imports both units' modules and asserts the lowered limit is
   reflected in formatted output. It fails on either unit alone (verified before the run).
3. `git diff --stat` must show both files and no files outside ownership.
4. Request totals: `ledger.requests.logged` equals the access-log line count, and
   `ledger.authorization.requestsUsed` equals it after reconciliation.

A human reads the final diff before merge; the controller's acceptance does not replace that.

## Evidence to keep

`eval/runs/e2-parallel/`: `ledger.json`, `summary.json`, `proxy-access.jsonl`,
`request-budget.json`, both unit diffs, combined-check output. The report must state whether the
combined check failed on each unit alone beforehand (the anti-vacuity proof).

## Stop conditions

Stop and report, without retrying, if: the proxy denies a request before the plan completes; the
combined check passes on an untouched fixture (vacuity); any unit writes outside ownership; the
process group survives cancellation. Do not re-run with a larger cap in the same series.
