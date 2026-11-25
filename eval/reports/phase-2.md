# Phase 2 — refactor, challenge, verify

**Date:** 2026-11-25
**Skills:** 15 (12 + 3). **Model:** `claude-haiku-5-5`, low. **Sandbox:** unchanged Phase 0.2 boundary.
**Spend:** $0.0137 of the $0.05 smoke allowance. 9 behavioural runs.
**Historical results:** untouched. Phase 1's failed artifact assertions and calibrated outcomes are
preserved exactly, including the criterion defect documented there.

---

## 1. Phase 1 corrections, applied before any new run

| correction | where | version |
| --- | --- | --- |
| architect artifacts must name an executable verification command | `skills/prosci-architect/SKILL.md` procedure + acceptance | `artifacts-v2/01-architect` |
| plan may be a reply or a file; a file is required only for multi-session/multi-agent work | `skills/prosci-plan/SKILL.md` step 7 + acceptance | `artifacts-v2/02-plan` |

The v1 scenarios in `eval/scenarios/artifacts/` are unchanged, so the original comparison and its two
failures remain readable. v2 is a separate layer that adds the requirement the skill now states and
accepts either plan surface, recording which one was used.

## 2. Boundaries, as shipped

| pair | split |
| --- | --- |
| `refactor` vs `fix` / `ship` | refactor preserves behaviour; fix corrects it; ship changes it. A "cleanup" that alters behaviour is refused. |
| `refactor` vs `architect` | a new boundary with alternatives is architecture; moving existing code is refactor. |
| `challenge` vs `review` | challenge reads a proposal; review reads a diff. Challenge refuses already-merged code. |
| `challenge` vs `architect` | architect picks a shape; challenge attacks any proposal including that pick. |
| `verify` vs `bar` | verify produces evidence; the bar judges completion. Verify refuses to answer "is it done". |
| `verify` vs `fix` | verify reports the discrepancy; fixing it is a separate route, so the report cannot hide which action changed the result. |

Each file carries triggers, non-triggers, inputs, procedure, output, failure handling and acceptance
criteria.

## 3. Mechanical effectiveness assertions, frozen before the runs

Each is an independent assertion, not a prose rating, and each was validated deterministically
(two-sided, no model, no network).

### refactor — behaviour preserved *and* the structural defect gone

Fixture: identical money formatting in `receipt.mjs`, `invoice.mjs`, `refund.mjs`; all tests green.

- `node --test` still passes.
- `toFixed(2)` appears **exactly once** across `src/*.mjs` (the defect: three copies).
- at least four modules reference a shared formatter (the helper plus its three callers).
- a `node -e` probe imports all three public modules and asserts the exact output strings
  `receipt: tea = 2.50`, `invoice: tea = 2.50`, `refund: tea = 2.50`.

That last one is the behaviour-preservation check: it executes the public contract instead of trusting
the suite's coverage.

### challenge — a known defect in a proposal is identified with evidence

Fixture: `docs/proposals/import.md` proposes truncating `data/records.json` and streaming into it,
claims "the existing tests already cover the import path" (there are none for it), and violates the
repo rule that all writes go through `src/store.mjs`.

Reply assertion (three patterns, all required): mentions truncation, names `records.json`, and states
that tests are absent or not covering it. The assertion is validated against a reference reply **and**
against "Looks good to me. The plan is fine, ship it." — if it passed that, it could not detect a missed
defect.

### verify — a real defect the green test suite cannot see

Fixture: `bin/report --total` sums a CSV; the unit test covers only a non-empty input. On an empty file
the surface fails with `TypeError: Reduce of empty array with no initial value`.

- an acceptance check that the suite is still green (so the defect is genuinely invisible to it),
- `requires_command: bin/report` — the assertion fails unless the CLI was actually executed,
- reply patterns requiring the empty case and its failure (`TypeError|reduce|throws|exit 1-9`).

The command requirement is what separates verification from describing verification. A reply that
guessed the defect without running the surface fails it.

## 4. Behavioural smoke, 9 runs, $0.0137

`agentsmd` + `--instruction direct`, 3 repeats, expanded 15-skill configuration.

| scenario | correct route | acceptance | reply assertion | command executed |
| --- | --- | --- | --- | --- |
| `p2-refactor` | 3/3 | 3/3 | n/a | n/a |
| `p2-challenge` | 3/3 | 3/3 | 3/3 | n/a |
| `p2-verify` | 3/3 | 3/3 | 3/3 | 3/3 |

Nine of nine passed every assertion. Reading one reply from each of challenge and verify (qualitative,
n=1, not scored): challenge named the `AGENTS.md` rule violation with the consequence and the evidence
that would disprove it; verify wrote its check before running, exercised four inputs, and reported the
empty-file failure as blocking with the exact error. Adequate work, and the assertions saw the same
thing.

## 5. Deterministic evidence

| check | result |
| --- | --- |
| `routing.mjs` | 38 scenarios, 8 negative, 15 rows, 0 failures |
| boundary scenarios `32`–`39` | refactor vs fix/architect, challenge vs review, verify vs review/fix |
| `install.mjs` | 5/5 harnesses, 15 skills |
| `fingerprint.mjs --check` | 15 skills, 0 drift |
| `validate-scenarios.mjs` | hard, calibrated, artifacts (v1), artifacts-v2, phase2 — all valid |
| `bin/test` | 32 pass |
| `eval/harness/test` | 7 pass (3 new: reply assertion matches, misses a bland approval, supports a regex) |

Harness additions, deliberately small: `reply_contains`, `requires_command`, and `reply_or_file` (which
records the surface used). No new framework, no scoring change to existing layers.

## 6. Security

No new tooling was introduced, so the Phase 0.2 boundary is unchanged: bwrap, scoped `HOME` and
`PI_CODING_AGENT_DIR`, one provider credential held by a localhost proxy outside the boundary, endpoint
and model restriction, request budget, body cap. `verify` runs the fixture's own CLI *inside* the
sandbox; no browser, no network surface, no real endpoint was exercised. `docs/security.md` remains the
accurate description, including its stated limits: the dummy token is readable inside, egress is open,
the proxy trusts loopback.

## 7. Limitations

- Three runs per skill. This establishes that each skill activates, runs, and can satisfy its assertion;
  it does not estimate a rate.
- The refactor assertion proves the duplicate is gone and the outputs match. It cannot judge whether the
  extracted helper is the *right* abstraction; a reviewer still decides that.
- The challenge assertion requires the known defect. It cannot tell whether the report also produced
  three invented objections — the skill's own criteria forbid that, and the smoke reply did not.
- The verify assertion checks one defect on one surface. A run that found this defect and missed a
  second one would still pass.
- No frozen-nine comparison was run for the Phase 2 skills; there is no nine-skill baseline containing
  them. Reachability is established by the 3/3 route selection, not by a comparison.
- `artifacts-v2` criteria were written after Phase 1's failures. That is deliberate correction, and it
  is versioned rather than folded into v1, so the original failure remains visible.

## 8. Status

Phase 2 is implemented, evaluated at smoke level, and reviewed here. Phase 3 (`prosci-refactor` and
friends are done; nothing beyond this was started) is not begun, and the next decision is whether to
spend on a comparative series — proposed shape: 2 configurations × 3 Phase 2 scenarios × 3 repeats = 18
runs ≈ $0.015, against the current skill set with and without the three skills. Not run, not approved,
not needed to close Phase 2.
