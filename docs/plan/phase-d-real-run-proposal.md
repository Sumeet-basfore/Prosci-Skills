# Proposal: one real-agent execution experiment

**Status:** proposal only. No paid execution authorized or performed. Requires explicit approval.

---

## What it would demonstrate

That a validated plan can be executed by real agents with the same lifecycle, ownership checks and evidence
the fake backend produced — on one small task, not a swarm.

## The experiment

| item | value |
| --- | --- |
| plan | `eval/scenarios/swarm/plan-discounts.json`, regenerated against a scratch clone of this repo |
| units | 3: architecture decision → implementation with a failing-first test → independent verification |
| backend | `bin/prosci-swarm-run --backend pi --allow-paid` |
| harness | pi CLI, one process per unit, in a git worktree |
| model | `claude-haiku-5-5` (the only model with `evidence: measured` in `agents/models.json`) |
| profile | `balanced` |
| runs | 1 execution (3 unit runs, no repeats) |
| expected cost | ≈ $0.01–0.03 total, from the measured $0.0008–0.004 per run in Phases 0–4 |
| expected tokens | 20k–60k per unit; ledger records reported tokens where available |

## Limits and who enforces them

| limit | value | enforced by |
| --- | --- | --- |
| approval | plan hash | controller (refuses to start) |
| units | 3 | controller |
| concurrency | 1 (sequential) | controller |
| wall clock | 20 min per unit, 60 min total | controller kills the process tree |
| retries | 1 per unit | controller |
| tokens | 60k per unit | **advisory** — used only if the harness reports usage |
| money | $0.05 | **advisory** — price table, not billing |

## Isolation guarantees, and the gap

- **Files:** each unit runs in its own worktree; the controller rejects any changed file outside `unit.files`.
- **Credentials:** *not* isolated by the controller. The proposal is to run the controller itself inside
  `eval/harness/sandbox.sh` (bwrap, scoped `HOME` and `PI_CODING_AGENT_DIR`, credential proxy with a model
  allowlist), which is the only boundary that has been verified.
- **Network:** egress remains open inside the sandbox by design; only the proxy path is restricted.
- **Publication:** none. The controller cannot push.

## What would count as a result

- Each unit reaches `succeeded` with its checks run by the controller, or fails for a stated reason.
- The ownership check either passes or catches a real violation.
- The ledger is sufficient for a human to review without rerunning anything.
- No credential is read: verified independently by the sandbox negative tests, not by redaction.

## What would stop it

Any of: a unit needs files outside its ownership (plan defect), a model without measured evidence, the
harness reporting cost differently from the price table, or a failing sandbox negative test.

## Cost of saying no

The prototype has never executed a real agent. Everything claimed about execution is proven against a fake
worker; the gap between "the controller is correct" and "a real agent completes a unit" is unmeasured.
