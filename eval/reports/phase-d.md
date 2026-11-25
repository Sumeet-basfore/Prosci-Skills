# Phase D — bounded single-harness multi-agent execution prototype

**Status:** implemented and validated with a fake backend. **No paid execution.** No spawning of real agents,
no publication, no force-push, no second adapter.

---

## 1. Backend choice

| candidate | verdict |
| --- | --- |
| **pi CLI (`pi -p`) per unit** | **chosen** — the installed harness, one process per unit, JSON output, `--model` and `--skill` explicit, no extra state |
| Orca workers | a runner on top of the same CLI; adds session state and a dependency without removing work |
| Ilvuno | M0 only, and its V1 non-goals say "no dispatch or control of coding agents" — so dispatch belongs here, and integration stays with `prosci-merge` |

Ilvuno's own README settles the overlap question: it plans to take independently produced changes, check
they work together and record evidence. Prosci's controller stops at producing branches, handoffs, checks and
a ledger — the artifacts that tool would consume. No duplication was introduced.

## 2. Controller — `bin/prosci-swarm-run`

```
bin/prosci-swarm-run <plan.json> --approve <plan-hash> [--backend fake|pi] [--out dir]
                                  [--concurrency N] [--deadline-min N] [--resume] [--allow-paid]
```

| rule | how |
| --- | --- |
| approval | `--approve` must equal `prosci-swarm hash <plan>`; a changed plan needs a new hash |
| dependencies | a unit starts only when every dependency is `succeeded`; otherwise it is `blocked` |
| concurrency | capped by `--concurrency` and by the profile; over-limit is refused before any unit starts |
| isolation | one `git worktree add -b prosci/<plan>/<hash>/<unit>` per unit; workers never touch the integration branch |
| ownership | after each unit, `git status`/`git diff` in that worktree; any changed file outside `unit.files` fails the unit |
| acceptance | the controller runs the unit's checks itself, in the worktree — not the worker's report |
| retries | `unit.budget.retries`, bounded; a timeout is not retried |
| deadline | global wall clock; on expiry every unfinished unit becomes `cancelled` |
| cancellation | SIGINT marks running/ready units `cancelled` and exits 130 |
| resume | `--resume` keeps `succeeded` units, re-plans anything left `running` |
| ledger | every transition persisted to `ledger.json` as it happens, including enforcement classification |

Lifecycle: `planned → ready → running → succeeded | failed | blocked | cancelled`. No other transitions are
written.

## 3. Simulated demonstration

Three-unit plan (`eval/scenarios/swarm/plan-discounts.json`), fake workers, scratch clone:

```
run complete: 3 succeeded, 0 failed, 0 blocked, 0 cancelled
u1-architect   succeeded  ready -> running -> succeeded  checks: test -f …  changed: [fake/u1-architect.txt]
u2-implement   succeeded  ready -> running -> succeeded  checks: test -f …  changed: [fake/u2-implement.txt]
u3-verify      succeeded  ready -> running -> succeeded  checks: test -f …  changed: [fake/u3-verify.txt]
```

Branches `prosci/plan-discounts/0ba1c8/u*` in the scratch repo only. The ledger records `approved: true`,
the plan hash, the backend, per-limit enforcement labels, and `checksRun` with each check's result.

## 4. Deterministic validation — 13 controller tests + 20 planner tests

Covered: dependency chain, dependency failure → blocked dependents, retries exhausting, ownership violation,
acceptance failure, crash, invalid worker output, missing approval, approval for a different plan, concurrency
over limit, global deadline, interrupted-run recovery, plan-hash sensitivity.

## 5. Security boundaries, stated exactly

| property | status |
| --- | --- |
| approval before any unit starts | **enforced** by the controller (plan hash) |
| dependency order, concurrency, deadline, cancellation | **enforced** by the controller |
| ownership of changed files | **checked** from git after each unit |
| worktree isolation | isolates files and branches — **not** a security sandbox |
| credential access by workers | **not** enforced by the controller; the pi backend inherits the environment. `eval/harness/sandbox.sh` remains the only credential boundary, and it is not used by this controller |
| budget in money | **advisory** — a price table, not billing |
| `--backend pi` | requires `--allow-paid`; still not authorized for execution |

The consequence, said plainly: a real worker launched by this controller could read this machine's
credentials. That is why only the fake backend is enabled by default, and why any real run needs both the
sandbox wrapper and an explicit decision.

## 6. Unsupported

- multiple execution adapters, background services, daemons, distributed scheduling
- automatic publication, force-push, semantic-conflict resolution
- parallel *processes*: the controller starts units sequentially and treats concurrency as a cap on
  simultaneous units; it does not fork workers
- token accounting for the fake backend (tokens are `null`, not zero)
