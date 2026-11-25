# Phase E — engineering expertise expansion

**Status:** complete. No paid runs, no new skills, no infrastructure beyond two regression suites for the
authorization defects. Seventeen identities, installation, swarm controller, registries, budgets and preview
conditions are unchanged.

---

## 0. Authorization discrepancies (fixed first)

| discrepancy | cause | fix |
| --- | --- | --- |
| three executions under an approval for one | the plan hash was the whole gate, and a hash is reusable | `bin/lib/exec-auth.mjs` keeps an authorization record on disk: executions, retries, requests. A paid backend now refuses without it; a second claim is refused |
| three attempts where one retry was authorized | retries came from the plan and nothing compared them to the authorization | `effectiveRetries = min(plan, authorized)`; the ledger records both numbers, so a clamp is visible |
| request budget reset per attempt | the proxy budget was per process | requests are charged per attempt against the persisted record |

Coverage: 7 tests for the record (single use, plan binding, restart survival, clamping, aggregation), 3 controller
tests (second execution refused, 5 planned retries produce 2 attempts and a `{plan:5, authorized:1}` record,
ledger carries authorization and usage). Details: `eval/reports/phase-d-authorization.md`.

## 1. What changed, by skill

All fourteen reviewed skills gained a substantive body section. Essential knowledge is in `SKILL.md`; the
three optional references from Phase A remain, unread and unrelied upon.

| skill | added expertise |
| --- | --- |
| architect | forces table with a check per force; interface rules (narrow waist, explicit errors, idempotency, no ambient state, bounded growth); worked retry-placement example with both interfaces; reversibility cost table; strawman-option anti-pattern |
| review | ordered checks (intent → correctness → security → concurrency → performance → maintainability); ten-class defect catalogue with diff symptoms; severity taxonomy; finding format |
| fix | eight-step diagnosis; symptom-to-cause table; worked empty-file case (poor vs effective); shotgun and catch-all anti-patterns |
| refactor | preconditions; characterization tests; five seams in preference order; worked extraction with structural and contract checks; five anti-patterns; when to stop |
| plan | what makes a dependency edge real versus invented; critical path as the floor; parallel-group invariants; range estimates; four anti-patterns |
| challenge | claim/evidence/falsifier table; eleven failure modes always walked; severity ladder; four fallacies; worked proposal review |
| understand | read order with a stop rule; six risk signals; what to persist and never persist; anti-patterns |
| investigate | one question one path; per-hop trace; instrumenting as binary search; evidence vs inference labels; five traps |
| merge | four conflict kinds, only one reported by Git; integration order; combined-state check; recovery for local vs published; four anti-patterns |
| release | ordered preflight; version-bump decision table; artifact proof; post-release; four anti-patterns |
| docs | write from verifiable claims; drift checks; structure by reader; four anti-patterns |
| init | survey-fact to action table; instruction-file quality; adoption sequence; anti-patterns |
| bar | evidence required per change type; evidence standard; when done is a human call; anti-patterns |
| prosci | misroute table (trap → route); the five non-negotiables each with a failure; when to skip the router |

Security, concurrency, performance, correctness and maintainability are covered where the brief asked: review has
the catalogue, fix has the diagnosis, refactor has behaviour preservation, plan has real independence, merge has
integration verification and release has production readiness.

## 2. Skill sizes

| skill | lines |
| --- | --- |
| prosci | 138 |
| prosci-architect | 173 |
| prosci-bar | 132 |
| prosci-challenge | 136 |
| prosci-design | 206 |
| prosci-docs | 134 |
| prosci-fix | 137 |
| prosci-init | 171 |
| prosci-investigate | 132 |
| prosci-merge | 149 |
| prosci-plan | 177 |
| prosci-refactor | 144 |
| prosci-release | 140 |
| prosci-review | 175 |
| prosci-ship | 204 |
| prosci-understand | 128 |
| prosci-verify | 121 |

No line target was set; content was added where it was non-redundant and left alone where it was already
adequate. The router and bar grew least because their job is small.

## 3. Validation

| check | result |
| --- | --- |
| `skill-lint.mjs` | 17 skills, 4 manifests, all references declared, named, path-safe, no machine paths |
| `routing.mjs` | 44 scenarios, 8 negative, 17 rows, 0 failures |
| `install.mjs` | 5/5 harnesses, removal leaves nothing |
| `fingerprint.mjs` | 17 skills, 0 drift after each group |
| scenario layers | 11 layers valid (hard, calibrated, artifacts, artifacts-v2, phase2, phase3, phase3-v2, phase3-v3, phase5, init, trial) |
| `bin/test` | 84 pass (was 74; +7 authorization, +3 controller) |
| `eval/harness/test` | 21 pass |
| network audit | clean, one documented exception |

Committed in four groups (E1–E4), each with lint, fingerprint and the full bin suite green before the next.

## 4. What is not validated

- **No behavioural evidence.** Whether the new expertise improves outputs is unmeasured; the only evidence is
  that the text is specific, non-redundant and lint-clean. A targeted artifact check for review and fix would be
  the next cheap step, not a benchmark programme.
- **No reference reading.** Phase A established that companions are ignored here; the bodies now carry the rules,
  and the references are unexercised.
- **The authorization fixes are tested only against the fake backend.** The real path — proxy accounting, a
  provider that reports cost — remains untested, and no further paid run is authorized.
- **Two skills kept the same size** (`prosci-bar`, `prosci` router): added content there displaces rules that
  already work.

## 5. Remaining limitations

- Worktrees still isolate files, not credentials; `docs/security.md` remains the accurate statement.
- Money is estimated from a price table; `totalFromProvider` is false on the proxied path.
- Concurrency above one, parallel units, and any model other than Haiku 5.5 remain unproven.
