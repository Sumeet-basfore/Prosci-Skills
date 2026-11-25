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

## 4. Frozen nine versus expanded twelve, 24 runs, $0.0345

Authorized comparison. Both arms share the model (`claude-haiku-5-5`, low), the sandbox, the
instruction (`--instruction direct`), the condition (`agentsmd`), the scoring, and independently run
acceptance. The only difference is the installed skill set, fingerprinted per run:

- frozen nine: `dce2cf8f6c6c` (worktree at `c33a178`)
- expanded twelve: `bd07722cb9d1`

### Arm A — artifact quality, 2 repeats per config

| scenario | frozen nine route | twelve route | twelve acceptance | frozen nine acceptance |
| --- | --- | --- | --- | --- |
| `art-understand` | `prosci-init` 2/2 | `prosci-understand` 2/2 | **2/2** | 0/2 |
| `art-architect` | `prosci-investigate` 2/2 | `prosci-architect` 2/2 | **0/2** | 0/2 |
| `art-plan` | `prosci-ship` 2/2 | `prosci-plan` 2/2 | **0/2** | 0/2 |

**Reachability:** the three new skills were selected in 6 of 6 expanded runs and 0 of 6 frozen runs,
because in the frozen set they do not exist. That is the whole reachability claim; it is not evidence
of better engineering.

**Effectiveness on frozen assertions: 2 of 6 expanded runs passed, 0 of 6 frozen.** Both expanded
failures are informative:

- `art-architect`: the artifact was written to `docs/architecture/discount-placement.md` and satisfied
  six of seven assertions — options, an interface in code, both module names, verification of the
  untouched sources — but it never named the command that verifies the decision (`node --test`). The
  skill requires consequences and reversibility, not the verification command. The assertion is
  reasonable and the skill text is short of it.
- `art-plan`: **no file was written.** The plan was produced in the reply, which the skill explicitly
  allows for work inside one session. The frozen assertion requires `docs/plan/*.md`, so it measured a
  surface the skill does not promise. This is a criterion defect discovered after freezing; it is
  recorded, not patched, because tuning after seeing results would make the comparison worthless.

### Arm B — calibrated tasks, 3 repeats per config

| task | frozen nine | expanded twelve |
| --- | --- | --- |
| `cal-missing-skills-dir` | 0/3 accept | 0/3 accept |
| `cal-version-flag` | 0/3 accept | 0/3 accept |

Identical, and identical routing (`prosci-fix`, `prosci-ship`). The new skills neither helped nor
interfered on existing work. Both arms fail these tasks, as the vanilla baseline did, which is what
made them discriminating in the first place.

### Qualitative review, labelled as such

One `art-plan` reply (expanded) was read by hand. It listed four units with files, a per-unit check, a
rollback, dependency edges, and it flagged a genuine ambiguity in the request before planning. Quality
looks adequate; the mechanical assertion simply cannot see a reply. This is a judgement on n=1 and is
not scored.

### Costs

| series | runs | spend |
| --- | --- | --- |
| `compare-artifacts` | 12 | $0.0197 |
| `compare-calibrated` | 12 | $0.0148 |
| **total** | **24** | **$0.0345** of $0.05 |

## 5. Artifact assertions, frozen before execution

`eval/scenarios/artifacts/`, validated deterministically to fail on the untouched fixture and pass with
a reference fix, before either arm ran:

- **understand**: the fixture has no `package.json`, so any `npm`/`yarn`/`pnpm` command in the
  persisted model is fabricated; the patch is non-empty and at most 25 lines; a real module fact
  (`ledger`) appears; no secret-shaped string; source files unchanged.
- **architect**: an artifact under `docs/adr` or `docs/architecture` with at least two options, an
  interface in code, both module names, the verification command; source unchanged.
- **plan**: a plan under `docs/plan` with at least three units, two runnable checks, a rollback, a
  dependency, and a parallel statement; source unchanged.

## 6. Limitations

- Each new skill had 3 behavioural runs in the smoke sample and 2 in the comparison. That detects
  "never activates" and "produces nothing"; it cannot rank two working skills.
- Two of three artifact assertions failed in the expanded arm, so no claim of improved engineering
  quality is supported. The one that passed (`understand`) also passed only in the expanded arm, which
  is reachability plus a model that followed the frozen checks.
- The activation number above is a smoke sample.
- Artifact acceptance is a set of greps. It catches a missing artifact, a fabricated command, a missing
  option or a missing rollback; it cannot judge whether an interface is sound or a task split is
  honest. Those were reviewed qualitatively once, and the limitation is stated rather than scored.
- `art-plan`'s assertion does not match the skill's own rule for single-session plans. Correcting one
  of the two belongs in the next iteration, chosen before the next run, not now.

## 7. Recommendation on Phase 2

Proceed, with two corrections first, both small:

1. **`prosci-architect`** should require the verification command inside the decision artifact. The
   measured failure is exactly that gap; it is a one-line change to the acceptance criteria in the
   skill, with the frozen scenario unchanged.
2. **`prosci-plan` and `art-plan` disagree about where a single-session plan lives.** Either the skill
   requires a file for any plan an agent produces, or the scenario accepts a plan in the reply. Pick
   one before the next run; do not adjust after seeing results.

Then Phase 2 as scoped — `prosci-refactor`, `prosci-challenge`, `prosci-verify` — with the same
discipline: a frozen artifact assertion per skill, validated to fail untouched and pass with a
reference fix, and a boundary scenario naming the neighbour each must not steal from. `prosci-verify`
overlaps `prosci-bar` most; define the boundary in its non-triggers before writing the body.

Evidence to carry forward: 12 skills reachable, no interference on existing tasks (24 runs, $0.0345),
and artifact quality still mostly unproven. Building more skills is reasonable; claiming they raise
quality is not yet supported.
