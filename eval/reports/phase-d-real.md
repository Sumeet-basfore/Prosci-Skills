# Phase D — one real-agent execution

**Date:** 2026-11-25 · **Model:** `claude-haiku-5-5` via the sandbox proxy · **Plan:** `plan-discounts` (3 units)
**Result:** all three units succeeded. **Estimated cost $0.0066** (price table; the provider does not report cost).
**Two earlier attempts failed** — see §6. Both failures are part of the result.

---

## 1. Pre-flight, before any paid agent

| check | result |
| --- | --- |
| sandbox negatives (`sandbox.sh --verify`) | pass: probe file, `~/.ssh`, real `~/.pi/agent/auth.json`, this repo's `AGENTS.md` all unreadable; no credential-shaped env vars; own pid namespace |
| child processes run inside the boundary | confirmed: a `sleep` child executed, so the wall clock is enforced **by the controller**, not by the OS |
| proxy | outside the sandbox, holding the key; sandbox only ever sees `sandbox-dummy-token` |
| plan hash | `3b4d93e4d04e410b`, computed over the exact plan file, copied inside the workspace |
| plan validation | 3 units, profile `balanced`, 75 000 planned tokens, ~$0.04 estimated |
| model assignment | `claude-haiku-5-5` — the only model with `evidence: measured` in `agents/models.json` |
| scratch repo | disposable copy of the plan's target fixture; **no branch or worktree in the Prosci repo** |
| proxy request budget | `PROXY_MAX_REQUESTS=80` for the run |

## 2. Execution

Sequential, 1 retry per unit, 20-minute deadline per unit, 112 s wall clock total.

| unit | role | attempts | changed files | controller-owned checks |
| --- | --- | --- | --- | --- |
| `u1-architect` | architect | 1 | `docs/adr/0001-discounts.md` | `grep '## Decision'` pass |
| `u2-implement` | implementer | **3** | `src/pricing.mjs`, `test/pricing.test.mjs` | `node --test` pass, `discounts([{cents:1000}],10)[0] === 900` pass |
| `u3-verify` | verifier | 1 | `docs/verification/discounts.md` | `node --test` pass, `grep exit` pass |

Lifecycle transitions recorded per unit: `ready → running → succeeded`, with `ready → running → ready → running → succeeded` for the two units that failed acceptance first.

Measured: 59 284 tokens, 23 tool calls (`bash`, `read`, `write`, `edit`), model **reported by the harness** as `prosci-proxy/claude-haiku-5-5` in every unit — the requested model, not a substitution.

## 3. Artifact propagation

`u2`'s branch contains `docs/adr/0001-discounts.md` from `u1`; `u3`'s branch contains both the ADR and the implementation. The controller merges each dependency branch into an integration branch and cuts the dependent worktree from its tip, and records the predecessor commit SHAs in the ledger (`984b29c`, `e958eb9`). A unit receives the artifacts, not the narrative.

## 4. Independent verification

`u3` ran in its own worktree, from the merged state, and its report deliberately refuses to over-claim:

> "This repo has no CLI… No command-line check could be run, so no CLI exit code was observed. The CLI surface is **not verified**."

It then listed what it did run at library level (`orderTotal({lines:[]})` → `0`, `discounts([],10)` → `[]`, `orderTotal({})` → uncaught `TypeError`) and labelled those as not standing in for a CLI check. That is the behaviour `prosci-verify` asks for.

## 5. Security: prevented versus detected

- **Prevented by the boundary:** access to the real credential store, `~/.ssh`, this repository, and the probe file. Verified by negative tests before the run, not by output redaction.
- **Detected after execution:** writes outside a unit's ownership. The controller compares `git status`/`git diff` against `unit.files` and fails the unit. Nothing was written outside ownership in this run — but that is detection, not prevention: a worker inside the worktree *could* write elsewhere in the workspace and would be caught afterwards.
- **Neither worktrees nor ownership checks are a filesystem sandbox.** The sandbox is `bwrap`; the worktree is isolation for files and branches within it.

## 6. Failures encountered (kept)

1. **Evidence lost.** The first execution wrote its ledger to `$WORK/out`, which is outside the mount points the sandbox exposes, so the ledger never landed. The run itself completed; its evidence did not survive. Output moved inside the bound home.
2. **Dependency artifacts did not propagate.** The second execution's `u2` branch was cut from the original base, not from `u1`'s commit: the controller used `git branch -f` to prepare an integration ref, but `git merge` merges into `HEAD`, so the merge landed on the wrong branch. Fixed to check out the integration branch (`git checkout -B`), with a regression test.
3. **Retries were necessary.** `u2` needed three attempts: the first two produced a `discounts` implementation its own acceptance check rejected. The retry budget (1) plus the controller's checks caught it — this is the mechanism working, not a defect.

## 7. Limits, in the terms they actually hold

| limit | status |
| --- | --- |
| approval by plan hash | enforced (wrong hash refused) |
| dependency order, concurrency, deadline, cancellation, retries | enforced by the controller |
| ownership of changed files | checked after each unit |
| proxy request budget (80) | enforced by the proxy |
| tokens | **reported only** — 59 284 observed, not capped |
| money | **estimated** $0.0066 from a price table; `totalFromProvider: false`. Not enforced, not billed evidence |

## 8. Evidence in the repository

`eval/runs/phase-d-real/`: `ledger.json` (every transition, attempt, tool call, usage block), `summary.json`,
`handoffs/` (the actual briefs given to each worker), `artifacts/<unit>/diffstat.txt`. Branches and worktrees remain
in the disposable scratch directory, not in this repo.
