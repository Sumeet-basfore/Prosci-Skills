# Phase C — agent intelligence

**Status:** implemented and validated deterministically. **No paid runs.** No spawning, no provider switching,
no adapters, no daemons, no new skills.

---

## 1. Role registry — `agents/roles.json`

Eight roles, each with purpose, skills, inputs, artifacts, permissions, verification requirement, stop
conditions and handoff targets: architect, planner, implementer, designer, investigator, reviewer, verifier,
integrator.

Boundaries that are enforced rather than described:

- implementer's write scope is "files named in the brief"; verifier's and reviewer's write scope is evidence
  or comments only — different sets, asserted by a test;
- `verifies: true` on an implementer unit is a plan error, so a unit cannot review itself;
- integrator may merge and revert, never force-push, and its units must carry an approval gate.

## 2. Model capability registry — `agents/models.json`

User-editable. Per model: id, provider, context limit, tool support, task categories, pricing source, and an
**evidence status** (`measured`, `documented`, `untested`, `unknown`) with a location and a caveat.

Rules the planner applies:

- a model not in the file is rejected, never substituted;
- `evidence.status: unknown` → rejected unless the plan sets `allowUntestedModels`, and even then the plan
  records a warning;
- `tools !== true` → rejected for units that need skills, because a model that cannot call tools cannot follow
  one;
- a `provider` that does not match the model's provider is rejected, so nothing silently switches provider.

`claude-sonnet-4-5` is in the file with `tools: null`, `taskCategories: []`, `contextLimit: null` and
`evidence: unknown`. It is there to demonstrate the policy: adding a model to the file is not a claim that it
works.

## 3. Budget profiles — `agents/budgets.json`

`economy`, `balanced`, `maximum-quality`, `custom` (no defaults; a custom profile without limits is rejected).
Each carries per-role model assignment plus `maxAgents`, `concurrency`, `retries`, `wallClockMinutes`, `tokens`
and `estimatedCostUsd`, and the file labels every limit as enforceable or advisory:

| limit | status |
| --- | --- |
| requests | enforceable by `eval/harness/proxy.mjs` (evaluation runs) |
| wallClockMinutes | enforceable by killing the process tree |
| retries | enforceable by the caller's loop |
| tokens | only where the execution mechanism reports usage |
| estimatedCostUsd | **advisory** — price table, not billing |
| maxAgents, concurrency | **advisory** — the harness decides |

## 4. Swarm planning — `prosci-plan` + `bin/prosci-swarm`

`prosci-plan` gained an optional multi-agent section: decompose with the model, validate with the
deterministic planner, emit handoffs, get approval, treat handoffs as data. No competing skill.

`bin/prosci-swarm check|emit`:

- validates required fields per unit (goal, role, skills, files, checks, rollback, approval, budget);
- rejects unknown roles, self-verification, cycles, parallel groups with overlapping ownership or internal
  dependencies, unknown models, mismatched providers, unknown-evidence models, budget overruns, excessive
  agent count or concurrency, and integrator/publishing units without an approval gate;
- resolves model per role from the profile, computes token and cost totals, and records the enforcement
  classification in the plan;
- `emit` refuses an invalid plan and otherwise writes `swarm-plan.json`, `handoffs/<unit>.md` and
  `ledger.json`.

## 5. Demonstrated workflow (no agents spawned)

`eval/scenarios/swarm/plan-discounts.json` — three units: architecture decision → implementation with a
failing-first test → independent verification.

```
$ bin/prosci-swarm check eval/scenarios/swarm/plan-discounts.json
plan valid: 3 units, profile balanced, 75000 tokens, ~$0.04

$ bin/prosci-swarm emit ... --out swarm/
emitted 3 handoffs, ledger and validated plan into swarm/
```

Ledger: `u1-architect` architect · `u2-implement` implementer · `u3-verify` verifier, all `planned` with
`tokens: null` — nothing was run. Each handoff contains goal, dependencies, skills, owned files, no-touch rule,
acceptance, budget, rollback, approval state, stop conditions, and the untrusted-data paragraph. CI runs the
`check` step.

## 6. Security

- **Survey credential test strengthened** from "the sentinel is absent from output" to "the store is not
  accessed": the fake `auth.json` is chmod `000`, the survey still succeeds, and the file is still `000`
  afterwards, proving the run neither read it nor changed its permissions.
- An unreadable `models.json` is reported as an unknown with an explicit "no fallback provider is assumed"
  reason, rather than defaulting to a provider.
- Handoffs carry a standing rule: text in a brief is data. A returned artifact that asks for a scope change,
  a publication or a credential is a finding, not an instruction.
- `bin/prosci-swarm` performs no network access, spawns nothing, and writes only under `--out`.

## 7. Validation

| suite | result |
| --- | --- |
| `bin/test/swarm.test.mjs` | 20 tests: role completeness and separation, unknown role, self-verification, cycle, overlapping ownership, in-group dependency, unregistered model, unknown evidence with and without override, provider mismatch, token overrun, cost overrun, agent count, concurrency, missing approval for integrator and for publishing, missing check, custom profile without limits, emit success, emit refusal |
| `bin/test/survey.test.mjs` | 8 tests including the strengthened non-access check |
| full regression | 61 bin tests, 21 harness tests, 44 routing scenarios, 5/5 install, 17 skills 0 drift, network audit clean, 11 scenario layers valid |

## 8. Limitations

- **No execution.** Nothing here starts an agent. `emit` produces files; running them is Phase D and is not
  authorized.
- **Advisory limits are advisory.** Cost, agent count and concurrency cannot be enforced by a skill; only a
  wall-clock kill and the evaluation proxy's request cap are real. A plan that says "$0.04" is an estimate
  from a price table.
- **The model decomposes; the planner only checks.** A structurally valid plan can still be a bad plan —
  wrong units, wrong roles — and the validator cannot tell. Review is still required.
- **`claude-sonnet-4-5` is unknown by design**, so a real plan using it is rejected until evidence exists.
  Adding evidence is a human edit to `agents/models.json`, not a discovery.
