# Phase 4 — final validation and alpha readiness

**Date:** 2026-11-25
**Spend:** $0.0315 of the $0.26 authorized across the two Phase 4 series ($0.03 v3 + $0.20 trial).
**Historical results:** untouched. Every earlier report, tag, fingerprint and versioned criterion is
preserved exactly as it ran.

---

## 1. Paraphrase lint, implemented before any further reply-based run

Three phases each shipped an assertion shaped to one reference answer, and each cost a paid run to find
out. `lintReplyAssertion` now requires:

- at least two paraphrases of the correct answer, all of which must match;
- a bland approval and a substantively wrong reply, each of which must miss at least one pattern.

Four unit tests cover it, including the strict-one-phrasing case that all three earlier assertions would
have failed. It runs in `validate-scenarios.mjs` for any scenario that declares paraphrases — `phase3-v3`
does; historical layers are preserved and not retro-linted.

## 2. v3 corrective evaluation, 6 runs, $0.0206

Corrective evidence, not an independent replication.

| scenario | route | acceptance | reply assertion |
| --- | --- | --- | --- |
| `p3v3-merge` | 3/3 | **0/3** | 2/3 |
| `p3v3-design` | 3/3 | 3/3 | **0/3** |

**Merge: still escalating, 0/3.** Third consecutive corrective run with the same behavioural outcome. Per
instruction, the acceptance was not weakened to reward escalation; the behaviour is recorded as a known
limitation. The escalation is coherent — the reply names the conflict with probe output — but it does not
produce the conforming change the task requires.

**Design: 3/3 acceptance, 0/3 reply.** The runs missed the literal words `empty` (2 of 3) and `loading`
(1 of 3) while passing every other pattern, including the disclosure. Whether the states were described
without those words or omitted is not recoverable from the stored runs, because the workspaces are
deleted and the harness asserts on assistant text only. Recorded as unresolved, not tuned: a fourth
adjustment against the same fixture would be fitting the assertion to one model's prose.

## 3. Real-repository pilot, 3 issues, 6 runs, $0.0109

Repository: this one. Issues filed for the trial: #30 (document harnesses), #31 (`--version`), #32 (alpha
page). Isolated copy per run, no branch merged, nothing published, frozen-nine versus seventeen under the
same model, instruction, sandbox and acceptance.

| issue | seventeen | frozen nine |
| --- | --- | --- |
| #30 harnesses doc | fail — wrote `docs/harnesses.md`, not the documented path | fail — README only |
| #31 `--version` | fail — no file changed | fail — no file changed |
| #32 alpha page | **pass** | **pass** |

- **No difference between configurations** at n=1 per task, and the two configurations failed the same
  two tasks in different ways.
- **Methodology works**: isolated copies, per-run acceptance, token and cost accounting, no merging, no
  publication. Six runs completed in about eleven minutes.
- **Two methodology defects found and recorded**: the first trial (r1) was invalidated because scope was
  measured against `HEAD`, which hides committed work (fixed, with a test); the second (r2) was invalidated
  because my own release edits entered the repo mid-series and contaminated later runs (the repo was
  reverted and the pilot re-run as r3).
- **The tasks are now implemented by hand** as release work, so the trial cannot be re-run without
  reverting them. The scenarios are archived with that note.

### Why the trial did not expand

The authorized stop conditions: reviewer availability, methodology fit, isolation, cost. Isolation and
cost were fine ($0.0109 of $0.20). Reviewer availability is not: no human reviewed any of the six results,
and n=1 per task cannot compare configurations. Expanding to three repositories under those conditions
would produce more unattributed numbers. **Stopped after the first repository, as authorized.**

## 4. Product readiness

| check | result |
| --- | --- |
| install into a clean target | 17 skills, exit 0 |
| re-install (idempotent) | 17 skills, no duplicates |
| `--check` | reports each entry and its origin |
| `--remove` | removes the 17 it installed, leaves the directory and marker-free state clean |
| `--version` | `0.1.0-alpha.1`, with a test |
| filesystem check across five harnesses | 5/5 |
| explicit invocation documented | README and `docs/alpha.md` |
| unnecessary activation, no-code request | 0/15 (Phase 0.1, negative scenario) |
| router ambiguity on real issue titles | **not measured** |
| documentation accuracy | claims now point at reports; the 11/15 figure is stated with attribution |

## 5. Privacy and telemetry

Zero product telemetry, unchanged and verified: `eval/harness/audit-network.mjs` scans `skills/` and
`bin/` for network primitives and telemetry vendor names in CI, with one documented exception
(`eval/harness/proxy.mjs`, evaluation only). `docs/network-inventory.md` states the inventory and the
limits of a static scan. Harness and provider data flows are described as theirs, not this project's.

## 6. Release readiness: evidence, blockers, recommendation

**Evidence for release:** 17 skills with boundaries enforced in their non-triggers; 44 deterministic
routing scenarios; installer verified on five harnesses including removal; one real-task pilot completed
in isolation with full cost accounting; privacy promise backed by an automated check; every negative
result published.

**Blockers, in order:**

1. **No human-reviewed trial.** Every real-task result in this repo is machine-scored. That is the
   difference between "the checks passed" and "someone would use this again".
2. **Merge escalates a constraint violation.** Three corrective runs, unchanged. It must be documented in
   the alpha notes as a known limitation, or fixed — but not tuned against the same fixture again.
3. **Artifact-quality assertions remain partly word-bound.** Design acceptance passed while its reply
   assertion failed; the same class of defect has appeared in every phase.
4. **Activation is 11/15, measured once, on synthetic tasks.** It is stated in the alpha page; it is still
   the weakest guarantee in the product.
5. **Real-task comparison is n=1 per config** and shows no difference.

**Recommendation: defer the public alpha.** Release as an experimental private preview to one or two
people who will read diffs and report back, under the caveats in `docs/alpha.md`, and make public alpha
conditional on (a) one human-reviewed trial with a merged result, (b) the merge limitation either fixed
or accepted in writing, (c) a decision on the word-bound assertion class rather than another silent
adjustment.

What would change the recommendation: a reviewed trial with a merged PR, no post-merge defects in a week,
and a second person completing a task unaided. None of those exist yet, and none of them is a run count.
