# Phase 1 — three capabilities, and what they changed

**Date:** 2026-11-25
**Scope:** `prosci-understand`, `prosci-architect`, `prosci-plan`. No Phase 2 work.
**Model:** `anthropic/claude-haiku-5-5`, thinking `low`, inside the Phase 0.2 sandbox (bwrap, scoped
`HOME` and `PI_CODING_AGENT_DIR`, credential proxy with a model allowlist and a request budget).

---

## 1. Boundaries, stated in each file

| skill | owns | refuses at the door |
| --- | --- | --- |
| `prosci-understand` | a durable working model of an unfamiliar repo, persisted in its instruction file | one question (`investigate`), greenfield (`init`), a repo already known (`ship`) |
| `prosci-architect` | shape: two candidate designs, interfaces as code, one recorded decision | one-file changes with an obvious shape (`ship`), ordering (`plan`), questions (`investigate`) |
| `prosci-plan` | ordered, verifiable units, the parallel set, approval boundaries | one small change (`ship`), choosing the shape (`architect`), finding a cause (`investigate`) |

Each file carries the seven requested sections: triggers, non-triggers, inputs, procedure, output,
failure handling, and measurable acceptance criteria. The acceptance criteria are checkable, not
adjectives: "every command persisted was executed in this session" (understand), "two options with an
interface sketch in code" (architect), "every unit has a runnable check" (plan).

Where they overlap, the non-trigger decides and names the owner. `understand` persists into
`AGENTS.md`; `init` creates it. `architect` records a decision; `ship` implements one. `plan` orders
work; `architect` shapes it.

## 2. Deterministic evidence

| check | result |
| --- | --- |
| `eval/harness/routing.mjs` | 30 scenarios, 8 negative, 12 rows, 0 failures |
| boundary scenarios `24`–`31` | 8 cases; each names the neighbouring route it must not steal |
| `eval/harness/install.mjs` | 5/5 harnesses, 12 skills, remove leaves nothing |
| `eval/harness/fingerprint.mjs --check` | 12 skills, 0 drift |
| `eval/scenarios/hard` + `calibrated` validators | all valid |
| `bin/test/*.test.mjs` | 32 pass |
| `eval/harness/test/*.test.mjs` | 4 pass |

Two test bugs surfaced by the expansion and fixed at the source:

- `eval/harness/install.mjs` asserted `names.length === 9`. It now compares against the lockfile count,
  so the check cannot pass while the installed set is wrong.
- `bin/test/install-skills.test.mjs` had `const NINE = 9`. It now counts the source tree.

## 3. Behavioural sample, 30 runs, $0.0266

Entry mechanism: the approved one — a repo instruction line naming the matching skill directly (no
router hop), `--instruction direct`, three repeats.

| scenario | route loads | correct | notes |
| --- | --- | --- | --- |
| `act-understand` | 3/3 | 3/3 | |
| `act-architect` | 2/3 | 2/3 | one run read nothing |
| `act-plan` | 3/3 | 3/3 | |
| `act-add-helper` | 3/3 | 3/3 | existing |
| `act-broken-test` | 3/3 | 3/3 | existing |
| `act-doc-drift` | 3/3 | 3/3 | existing, previously 0/3 before skills were named |
| `act-explain` | 3/3 | 3/3 | existing, previously 0/15 |
| `act-neg-tell-command` | 0/3 | correct | destructive request, nothing loaded |
| `act-neg-trivial` | 3/3 docs, 0/3 heavy | correct | comment typo; docs route is defensible, plan/architect are not |

**20 of 24 positive runs loaded the correct route (83%)**, up from 11/15 (73%) in Phase 0.2 with nine
skills. Different scenario mix, so this is not a like-for-like comparison, and n is 3 per scenario — it
is a smoke result, not an effect size. The threshold was 12/15; this sample is not the experiment that
establishes it.

The 30 runs include a re-run of the negative scenario after its semantics were corrected: a comment
typo may use the docs route, so `should_not_activate` was replaced with `forbid_routes` naming only the
heavy routes. The harness change is 6 lines.

## 4. Not run, and what it would cost

The frozen-nine versus expanded-twelve comparison on the calibrated tasks was **not** run. Proposed,
pending review: 2 configurations × 2 kept calibrated tasks × 3 repeats = 12 runs, plus 12 runs on the
three new activation scenarios against the frozen nine, ≈ 24 runs ≈ $0.02. It answers whether the new
skills changed route selection for existing work; it does not establish general superiority.

## 5. Limitations

- Each new skill had 3 behavioural runs. That detects "does not activate at all" and little else.
- No acceptance check yet distinguishes `architect`'s artifact quality from `plan`'s; both pass by not
  breaking the fixture. Their acceptance criteria are written for a human or a reviewer agent to apply.
- The activation number above is a smoke sample; the calibrated run that would support a claim is
  proposed in §4, not performed.
