# Phase B — project intelligence

**Status:** implemented and validated deterministically. No paid runs. No swarm, no model switching, no
adapters, no new skills.

---

## 1. `bin/prosci-survey`

Read-only, deterministic JSON. Contract from `docs/plan/phase-b-spec.md`.

| property | how it is kept |
| --- | --- |
| facts, not opinions | every entry is `{ value, source }`; no scores, no prose |
| explicit unknowns | `unknowns[]` with a reason; a field that could not be determined is `null`, never a guess |
| no mutation | reads files and runs `git status`/`rev-parse` only; `--verify` runs the detected *test* command, which is the only execution |
| no credential reads | model metadata from `models.json` provider names and model ids only; `auth.json` is never opened or named |
| deterministic | keys sorted, arrays sorted, no timestamps; two runs produce byte-identical output |

Detects: VCS state, stacks and manifests, lockfile, monorepo, instruction files and the factory block,
commands **with provenance**, test dirs and frameworks, CI, harness directories, provider/model ids,
`.env` file **names** and ignore status, risk codes, and rule-table recommendations for skills and roles.

## 2. `prosci-init`

Rewritten to consume the survey rather than inspect by hand: survey → read facts back with sources and
unknowns → recommend from a rule table keyed on risk codes → **show the exact change and wait for approval**
→ write the minimum (one `AGENTS.md` block, verified commands only) → validate by running the commands and
re-running the survey → state the reversal.

Boundaries unchanged and explicit: survey is machine facts, `prosci-understand` builds the human model, init
composes and writes; a working repo needs no init at all.

## 3. Validation

| check | result |
| --- | --- |
| survey accuracy on five fixtures | 8 tests: declared command + instruction file, python/rust conventions, empty repo risks, monorepo, every fact sourced, determinism, no modification, no credential read |
| survey does not modify a repo | tree hash before/after `survey` **and** `survey --verify` — unchanged |
| credential sentinel | a fake `auth.json` containing `SENTINEL-SECRET-VALUE`; the value never appears in output, nor does the file name |
| init scenarios | two, validated deterministically: an untouched repo awaiting approval, and a survey-only repair report |
| full regression | 11 scenario layers valid, 44 routing scenarios 0 failures, 5/5 install harnesses, 17 skills 0 drift, network audit clean, 41 bin tests, 21 harness tests |

## 4. Approval guarantees, honestly

- **Executable:** the survey cannot write. `--verify` runs one detected command and records its exit code.
- **Not executable:** the approval gate in `prosci-init` is an instruction-level rule — the agent asks and
  waits. Nothing prevents a model from writing anyway. It is backed by review, not by a sandbox. This is
  stated in the skill's "Approval guarantees" section rather than implied.
- **Reversible:** the minimum change is one `AGENTS.md` block plus, in a no-test repo, the smallest harness
  as its own change. The reversal is deleting the block or reverting that commit; init must state it before
  writing.

## 5. Known limitations

- **`python -m pytest` is a convention, not a verified command** until a human or `--verify` runs it. The
  survey labels it `verified: null`.
- **Framework detection is filename- and import-based**, so an unusual layout reports `frameworks: []` rather
  than guessing.
- **Harness detection is directory existence**, not capability; `docs/supported-harnesses.md` remains the
  statement of what is tested.
- **The five fixtures are small.** They prove the contract and the mutation guarantees, not coverage of real
  monorepos.
