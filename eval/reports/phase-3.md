# Phase 3 — merge and design

**Date:** 2026-11-25
**Skills:** 17 (15 + 2). **Model:** `claude-haiku-5-5`, low. **Sandbox:** unchanged.
**Spend:** $0.0189 of the $0.05 cap. 6 behavioural runs.
**Historical results:** untouched. Phase 2's smoke results, Phase 1's failed artifact assertions and the
versioned criteria (`artifacts/`, `artifacts-v2/`) are exactly as they were.

---

## 1. Two skills, and the line each draws

| skill | owns | refuses, naming the owner |
| --- | --- | --- |
| `prosci-merge` | integrating independent changes, worktrees, stacked PRs, cross-repo shapes; verifying the combined state; recovery | authoring (`ship`), a single diff (`review`), publishing (`release`), the definition of done (`bar`) |
| `prosci-design` | the product surface: flow, states, accessibility, responsive behaviour, copy, acceptance per state | contracts and schemas (`architect`), implementation (`ship`/`fix`), code review (`review`), running the surface (`verify`) |

Both carry the seven sections, with acceptance criteria written as checks rather than adjectives.
`design` is explicit that a source-only review may not be described as visual verification.

## 2. Deterministic evidence

| check | result |
| --- | --- |
| `routing.mjs` | 44 scenarios, 8 negative, 17 rows, 0 failures |
| boundary scenarios `40`–`45` | merge vs review/release, design vs architect/fix |
| validators | hard, calibrated, artifacts, artifacts-v2, phase2, phase3 — all valid |
| `install.mjs` | 5/5 harnesses, 17 skills |
| `fingerprint.mjs --check` | 17 skills, 0 drift |
| `bin/test` / `eval/harness/test` | 32 / 7 pass |

Harness: `setup_commands`, because a working-tree copy cannot carry two branches cut from one base.
The scenario validator runs them too, so the fixtures are validated the way they will be executed.

## 3. The merge fixture: a semantic conflict Git cannot see

Two branches from one base, both green alone:

- `feature-a` lowers `DEFAULT_LIMIT` from 10 to 5 and updates the tests that pin it.
- `feature-b` adds `src/batch.mjs` with `BATCH_SIZE = 8` and a batching test.

They touch disjoint files. Git merges both cleanly, each suite passes, and the combined state contradicts
itself: batches of eight against a limit of five. Nothing in either branch's tests compares the two,
which is exactly why the regression is invisible to them.

Acceptance (frozen before running): both changes present, batch size no longer above the limit, suite
green, both branches still exist, tree clean.

## 4. Results, and the failure that is worth reading

| scenario | route | reply assertion | frozen acceptance |
| --- | --- | --- | --- |
| `p3-merge` | 3/3 `prosci-merge` | 3/3 | **0/3** |
| `p3-design` | 3/3 `prosci-design` | n/a | **0/3** |

Neither zero is a capability zero, and reporting it as one would be wrong:

**merge — detection 3/3, resolution 0/3.** Every run merged both branches, ran the combined probe
(`batch sizes [8, 8, 4]`, `withinLimit [false, false, true]`), and *reported the conflict*: "batches of 8
exceed the new limit of 5 … I did not pick one; that's your call." The frozen acceptance requires the
agent to reconcile, and the skill's failure section tells it to escalate a contradiction. The two
disagree. The agent followed the skill and failed the assertion.

**design — requirements written, file not created.** Every run produced a state table, accessibility
requirements, copy and the disclosure that nothing was rendered, in the reply. The assertion looked for
`docs/design/payment.md`. The skill documents its output as a requirements report, not a file. This is
the same surface mismatch as `art-plan` v1, made twice.

Both are recorded as criterion defects, not patched, because the criteria were frozen before execution.
The correction, chosen but not applied, is in §7.

## 5. What each run did do

- **merge**: named the base commit, each branch and its own check, the order, the semantic conflict with
  probe output, the recovery (`git reset --hard <base>` on an unpublished branch), and confirmed it
  touched neither input branch. It also refused to publish. Detection, preservation and recovery are
  all present; only the reconciliation decision is missing, and it was escalated on purpose.
- **design**: read the existing screen, tokens and spec before proposing; produced all four states with
  copy, keyboard and screen-reader requirements, a 320px breakpoint, and the sentence "I have not
  rendered the screen, so none of the visual results below are verified." The brief's requirement that a
  missing visual surface be disclosed was met in the reply.

## 6. Measurement notes

- **Merges are invisible to `changedFiles`**, which compares the tree with `HEAD`. A merge changes
  history, so the file list is empty even when the integration happened. The acceptance uses
  `git log --oneline`, so the run is judged correctly, but any scope check on a merge is measuring
  nothing. Recorded as a limitation of the harness, not fixed here.
- No frozen-fifteen arm was run: the skills did not exist in it. Reachability is the 3/3 route selection.
- One fixture per skill. A merge scenario with three branches, or a design task with a rendered surface,
  would test different things and was not attempted.

## 7. Proposed corrections, for review — not applied

1. **`prosci-merge` wording.** Distinguish a contradiction between two *intents* (escalate) from a
   constraint meeting a value (conform: the magic number moves, the policy does not). With that split,
   the fixture's correct resolution is batch 5, and escalation is reserved for genuine intent conflicts.
2. **Criteria v2 for both skills.** `p3-design` accepts a reply or `docs/design/<screen>.md` via the
   existing `reply_or_file`; `p3-merge` keeps the semantic check but accepts either reconciliation or a
   documented escalation **with** the conforming change applied — one of the two, stated in the run.

Neither is applied, and no re-run was done. Re-freezing and re-running (6 runs, ≈ $0.019) is the next
step if these corrections are approved.

## 8. Security

No new tooling: the sandbox, proxy restrictions and `docs/security.md` limits are unchanged. Neither
skill needs a browser; `design` explicitly reports when nothing was rendered rather than implying a
visual check. Merge runs perform local Git operations only inside the fixture; nothing is pushed, and
the sandbox has no remote.

---

## 9. Corrective evaluation, after the accepted corrections

**This is a corrective evaluation, not an independent replication.** Same fixture, same model, same
sandbox; the skill wording and the criteria changed. 6 runs, $0.0191 of the $0.03 cap.

| what changed | where |
| --- | --- |
| resolve a violated constraint instead of escalating it | `skills/prosci-merge/SKILL.md` |
| reply or file accepted for design | `eval/scenarios/phase3-v2/02-design.json` |
| scope measured against the pre-integration base | `changedFiles(workspace, base)`, `changes_since: "fixture"` |
| criteria versioned | `eval/scenarios/phase3-v2/`; Phase 3 v1 untouched |

### Results

| scenario | route | acceptance | reply assertion | scope |
| --- | --- | --- | --- | --- |
| `p3v2-merge` | 3/3 | **0/3** | 3/3 | 5 files changed, measured correctly |
| `p3v2-design` | 3/3 | 3/3 | **0/3** | 0 files, source untouched |

**Merge: still escalated, 0/3.** The wording now separates a genuine intent conflict from a violated
constraint, and every run still reported "one interaction … needs a decision before anything is
published" instead of applying batch 5. The scope fix works: the same runs now report five changed
files, where the old call reported none.

**Design: the disclosure is there; the assertion is too narrow.** Every run wrote "Nothing was rendered,
so every visual and focus claim below is unverified", plus all four states, copy, keyboard and
screen-reader requirements, focus visibility and the 320px breakpoint. Eight of nine patterns matched.
The ninth required the literal wording "not visually inspected" or "visual inspection", and the run used
"nothing was rendered … unverified". The property is present; the grep is shaped to the reference
wording.

Both are recorded, not tuned. This is the third assertion in three phases that tested a phrasing instead
of a property (`art-plan` v1, `p3-design` v1, now `p3v2-design`), which is a pattern worth naming: an
assertion copied from a reference solution measures the reference, not the skill.

### Proposed v3 criteria — not applied

1. **design disclosure**: accept any phrasing that states the absence, e.g.
   `/(nothing was rendered|not rendered|no rendered surface|visual(ly)? .{0,20}not (verified|inspected)|unverified)/i`,
   validated against three paraphrases of the reference, not one.
2. **merge resolution**: keep the semantic check, and add a second, weaker assertion that separates
   detection from resolution, so a run that escalates scores detection rather than failing both.
3. **assertion lint**: for every reply assertion, validate against at least two paraphrases and one
   bland approval, and fail the scenario if a paraphrase of its own reference does not match. That rule
   would have caught all three cases before any paid run.
