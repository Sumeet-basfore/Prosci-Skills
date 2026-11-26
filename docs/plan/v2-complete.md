# Prosci v2 — complete and frozen

Status: **complete, feature-frozen** at `e01ebf0`.
This records what exists, what was demonstrated, what remains unproven, and the rule for changing it.
It supersedes the open-ended v2 proposal, not the phase reports it cites.

## What exists

**17 skills** in `skills/`, each a `SKILL.md`, three of them with `references/`:

`prosci` (router), `prosci-understand`, `prosci-architect`, `prosci-plan`, `prosci-refactor`,
`prosci-challenge`, `prosci-verify`, `prosci-merge`, `prosci-design`, `prosci-ship`, `prosci-fix`,
`prosci-review`, `prosci-bar`, `prosci-investigate`, `prosci-docs`, `prosci-release`, `prosci-init`.

**8 agent roles** (`agents/roles.json`): architect, planner, implementer, designer, investigator,
reviewer, verifier, integrator — with write scopes, verification expectations and hand-off rules.

**Budget profiles** (`agents/budgets.json`): `economy`, `balanced`, `maximum-quality`, `custom`.
`mixed` is an evaluation-only profile for assigning different models to different roles; it is not a
recommended production setting.

**Tooling** in `bin/`:
- `prosci-survey` — read-only repository facts with sources; no credential store is read.
- `prosci-init` — survey → recommendation → approved write.
- `prosci-swarm check | emit | hash` — validate a plan, produce handoffs, bind approval to a plan hash.
- `prosci-swarm-run` — execute an approved plan: dependency order, bounded concurrency, one worktree per
  unit, ownership checks, independent acceptance, per-unit deadlines, cancellation, resume.
- `install-skills` — link/copy/check/remove across harness directories with a marker file.
- The optional evidence gate: `context-doctor`, `verify`, `install-gate`.

## Invocation options, and what the evidence says

| Option | How | Evidence |
|---|---|---|
| Passive discovery | skills installed; agent decides to open one | **0 / 15** loaded a route in the frozen activation series |
| Explicit skill | `/skill:prosci-fix <task>` | Works in print mode: body expands, the route's file is read, the workflow is followed |
| Repository instruction | one line in `AGENTS.md` naming the matching skill | **11 / 15** loaded the right route (best measured activation) |
| Master router | `/skill:prosci <task>` then a named route | Second hop works when invoked explicitly; passive router use was **1 / 15** |
| Direct injection | controller places assigned bodies in the worker prompt | Opt-in only. L-001: 9 of 12 runs completed; adherence 4/4 injected vs 2/5 discovered, but confounded and incomplete — **inconclusive** |

Loading is not adherence and adherence is not correctness. Those were measured separately throughout;
see `eval/reports/phase-0.1.md`, `phase-0.2.md`, `phase-a.md`, `l001.md`.

## Demonstrated mechanisms

- The routing table is internally consistent: 44 scenarios, 17 rows, 8 negative, 0 failures. This tests
  the table, not a model.
- Installation lands the files and resolves every relative link on five harnesses; removal touches only
  what the installer created. Behaviour is only measured on pi.
- Sandbox isolation is checked before every evaluation series: credentials, this repo and other projects
  are absent, not merely unwritable (`docs/security.md`).
- Request accounting is atomic at the proxy boundary; a denied request spends nothing; budgets are
  reconciled into the authorization record.
- Worktrees isolate files; ownership is checked from git; acceptance is run by the controller, not the
  worker.
- A three-unit plan executed end to end with real models: E2 (3/3 units, 11 requests, ~$0.00136) and the
  E3b economy arm (3/3, 17/24 requests, ~$0.00119). Timestamps, exit states and termination are recorded.
- Model probes (E3a) verified identity, tool use, usage reporting and isolation for two models on one
  provider.

## Unproven engineering improvements

- **That Prosci makes an agent produce better software.** No completed human-reviewed real-project trial.
  The one real-repo pilot passed 1 of 3 issues in both the 9-skill and 17-skill arms: no measured
  difference (`eval/reports/phase-4.md`).
- **That direct injection is better than discovery.** L-001 is incomplete and its one acceptance gap came
  from a hidden citation convention. Injection remains opt-in.
- **That mixed-model role assignment improves outcomes.** The first mixed arm was invalid (shared proxy and
  contaminated base); the corrected arm completed 2 of 3 units and exhausted its request cap. No quality
  claim (`eval/reports/e3b.md`).
- **That activation is reliable.** Best measured is 11/15 with a cooperative repository instruction.
- **Cross-harness behaviour.** Files were verified; model behaviour was not tested outside pi.
- **Automatic resolution of semantic merge conflicts.** `prosci-merge` detects and escalates; it does not
  resolve a contradictory constraint.

## Known limitations

- The controller's authorization is enforced by the controller and the proxy, not by the operating system.
  It bounds a cooperative worker; it is not a hostile-code sandbox. Evaluation runs use the bwrap boundary.
- Worktrees plus ownership checks do not protect credentials. `docs/security.md` states the boundary.
- Provider-reported cost is often zero for the custom proxy provider; cost figures are catalogue-rate
  estimates and labelled as such.
- The proxy allowlist must be set explicitly for multi-model runs (`PROXY_MODELS`); the default is one
  model.
- A request cap can end a series mid-run. Those runs are recorded as `incomplete-budget`, never scored as
  correctness or adherence failures.

## Freeze rule

No new skills, evaluation phases, execution backends, paid evaluations, architectural expansion or public
release operations are authorized. Change Prosci only in response to a demonstrated problem encountered
while using it on real work; that change starts from the failing evidence, not from a proposed capability.

Public release stays subject to `docs/release-conditions.md`.
