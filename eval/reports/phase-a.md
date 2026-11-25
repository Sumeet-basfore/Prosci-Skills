# Phase A — modular skill packages, design depth, ship and verify

**Date:** 2026-11-25
**Scope:** `docs/plan/prosci-v2-proposal.md` Phase A only. Freeze otherwise intact: seventeen identities, no
new runtime, no survey tool, no swarm planner, no adapters.
**Paid runs:** none. This phase is deterministic-only, as authorized.

---

## 1. What changed

| skill | before | after |
| --- | --- | --- |
| `prosci-design` | 106 lines, no references, 7 steps | 158-line procedure + manifest + **8 references** (typography, colour, composition, states, accessibility, motion, identity, research/critique) |
| `prosci-ship` | 168 lines, no references | unchanged sequence + **3 references** (spec, tests, production) |
| `prosci-verify` | 89 lines, no references | unchanged procedure + **3 references** (CLI, HTTP, browser) |

The other fourteen skills are untouched. Two of them (`prosci`, `prosci-bar`) needed nothing; twelve wait
for a demonstrated gap, per the amendment's rule that depth follows value rather than symmetry.

## 2. Format decisions, and why they differ from the first draft

- **No reference cap.** `prosci-design` has eight; the first draft allowed three. Context is controlled by
  `load_when` triggers, not a count. The design skill is the counter-example that proved the cap wrong.
- **250 lines is a guideline, not a ceiling.** The design references run 69–83 lines each; the longest skill
  reference is 83. Nothing was padded to fill a quota, and nothing was cut to meet one.
- **A `skill.json` manifest, not richer frontmatter.** pi parses frontmatter generically and reads only
  `name`, `description` and `disable-model-invocation`, so extra keys are ignored — safe on pi, unverified
  on the other four harnesses. Metadata that nothing else consumes belongs in a file we can validate.
- **Mandatory rules stay in `SKILL.md`.** "Never claim visual verification without a rendered surface" is in
  the body, not in a reference: a safety rule that requires an optional read is not a rule.

## 3. Design intelligence, concretely

The skill now runs: understand → intent (brief) → directions → specifics → requirements → inspect if
renderable → critique → disclose. Each step names the reference it needs, at the step it needs it.

Substance added, not adjectives:

- **Typography**: scale ratios per product type, measure in characters, tabular numerals, loading strategy.
- **Colour**: roles before values, worst-case contrast pairs, dark mode derived by role, brand colour that
  cannot carry white text.
- **Composition**: density table by product type, hierarchy order (space → size → weight → colour →
  decoration), the "three equal feature cards" diagnosis.
- **States**: the mandatory set with copy skeletons and a focus-destination table.
- **Accessibility**: keyboard, focus, names, live regions, targets, and an explicit split between what
  source checks can prove and what needs rendering.
- **Motion**: durations by transition class, reduced-motion semantics, what not to animate.
- **Identity**: carriers, token binds, and the anti-generic table with a product-specific alternative for
  each default — framed as "earn it", not "never do it".
- **Research and critique**: a six-line brief, four research questions, a fixed critique order, and a
  handoff that states what is unverified.

Gradients, centred layouts, rounded corners and any colour are explicitly permitted; the skill requires the
*reason*, and rejects them as defaults. That is the amendment's line, implemented.

## 4. Validation added

`eval/harness/skill-lint.mjs`, in CI, deterministic:

- every manifest reference exists, lives under `references/`, and does not escape the package (path safety);
- the procedure names the reference, so something will actually read it;
- every companion file is declared, so no dead knowledge accumulates;
- companions without a manifest are rejected, while skills with no manifest and no companions stay valid
  (backward compatibility for the fourteen unchanged skills);
- references over 250 lines warn rather than fail.

Six unit tests cover the lint itself: well-formed package, undeclared companion, missing file, unread
reference, escaping path, manifest-free skill.

Fingerprint scope extended: every file in every skill directory is hashed, not only `SKILL.md`, so a
reference cannot drift under a stable body. `install-skills --check` now resolves manifest references after
installation. Both are covered by the existing install harness (5/5) and lockfile (17 skills, 0 drift).

## 5. Evaluations prepared — not run

`eval/scenarios/phase5/`, each validated deterministically (fails untouched, passes with its reference fix):

| scenario | mechanical acceptance | loading measured separately |
| --- | --- | --- |
| `p5-design` | brief with a named constraint, four states with copy, accessibility + focus, contrast, breakpoint, "unverified" disclosure, source untouched | `requires_read: interaction-states, accessibility` |
| `p5-ship` | spec file with non-goals and rollback, working `discounts()`, suite green | `requires_read: spec, tests` |
| `p5-verify` | reply with exit codes for empty/missing/no-argument, paraphrased assertion with two decoys | `requires_read: cli` |

`requires_read` is a new scenario field: it asserts the run opened the file its trigger named. It is
reported as `referenceLoad`, **separate from acceptance** — a read is not evidence of application, and the
report says so.

**Proposed paid comparison, not authorized and not run:** old skill set (commit `c790e37`) vs Phase A on
the three scenarios, 3 repeats each, 18 runs ≈ $0.02, measuring reference loads (new arm only), acceptance
and reply assertions. Decision it answers: does the depth produce a better artifact, or only a longer one.

## 6. Limitations

- **No behavioural evidence yet.** Nothing here shows the new references improve output. The scenarios are
  prepared; the run is not authorized.
- **Reference read-rate is unknown.** If a future run shows the agent skipping references, the fix is
  better triggers, not more files.
- **Other harnesses remain unvalidated** for frontmatter and for reference loading; the manifest avoids
  depending on them, but the design references have only been exercised by pi.
- **Design quality is not machine-verifiable.** Contrast from tokens and focus order from source are
  checkable; rendered visual quality is not, and the skill says so rather than claiming it.
- **Disk note:** `/tmp` is a full 7.7 GB tmpfs shared with other work on this machine. Harness runs were
  moved to `TMPDIR=$HOME/.tmp/prosci`; nothing belonging to another project was removed.

---

## 7. Comparative evaluation, 18 runs, $0.0242 of $0.05

Pre-upgrade set (`c790e37`, 17 skills, single files) versus Phase A (`b731b62`). Same model
(`claude-haiku-5-5`, low), same instruction (`--instruction direct`), same sandbox, same frozen scenarios.

**Environment pre-checks:** `/home` had 96 GB free; `/tmp` is a full 7.7 GB tmpfs shared with other work, so
all runs used `TMPDIR=$HOME/.tmp/prosci`. The scratch root is not inside `~/.pi`, `~/.ssh` or this repo, and
the sandbox binds the workspace and run home explicitly, so isolation is unchanged. No directory belonging
to another project was removed or modified.

| metric | Phase A | pre-upgrade |
| --- | --- | --- |
| route selected correctly | 9/9 | 9/9 |
| **references loaded** | **0 of 18 required reads** | n/a (no references) |
| acceptance | 4/9 | 3/9 |
| tokens per run (mean) | 15,565 | 13,933 |
| spend | $0.0242 total | — |

### The result that matters: reference loading was zero

Across nine upgraded runs, the agent **never opened a reference file**. `requires_read` failed in every run
of every scenario, and the run transcripts contain no read whose path includes `references/`.

Cause, from the evidence rather than assumption:

1. **The manifest is invisible to the model.** `skill.json` is never rendered into context. `load_when`
   clauses are documentation for us, not instructions to the agent.
2. **The only visible pointer is prose mid-procedure** ("read `references/interaction-states.md`"), with a
   path relative to a skill directory the agent has no reason to resolve.
3. **Nothing in the task asks for a reference.** The request says "define the states"; the pointer lives in
   step 4 of eight.

So this is **instruction placement plus indirection**, not trigger clarity in the manifest — the manifest was
never in play. A fix belongs in the visible body (a first-step line naming absolute-resolvable paths, or a
harness that injects them), not in more references.

### Correct knowledge application

Separate from loading, and judged by the artifacts (preserved under
`eval/runs/phase-a-compare/blind-review/`, labels anonymised, mapping in `blind-review-mapping.json`):

- **Design**: both arms wrote substantial requirements documents (158–251 lines, 9–17 sections, contrast and
  the "unverified" disclosure present in all six). States coverage: the pre-upgrade arm named all four in 1 of
  3 runs; Phase A named three in 3 of 3 — the missing one is `loading` every time. No run was told to read a
  reference, and the new skill's extra structure (brief, critique, disclosure) appears anyway, so the design
  gain came from the rewritten **body**, not the references.
- **Ship**: both arms implemented `discounts()` and kept the suite green. A spec file appeared in all six;
  non-goals and rollback appeared in **1 of 6**, from the Phase A arm (rep 3, 69-line spec). The reference
  that would have enforced those two fields was never read, and that run happened to include them anyway.
- **Verify**: 6/6 in both arms, exit codes and the empty-file failure reported. The scenario is too easy to
  separate the versions; it measures the reply, and both replies were correct.

### Unnecessary reference loading

Zero, trivially: nothing was loaded. The metric is in place (`activation.referencesRead`) and will matter only
after loading works at all.

### Token and monetary cost

Phase A costs **+11.7% tokens** per run (15,565 vs 13,933) with no measured acceptance gain (4/9 vs 3/9, a
single-run difference inside noise at n=3). The extra tokens come from longer skill bodies, not from
references, since none were read.

### Verdict

**Inconclusive on quality, negative on mechanism.** The package format and the design body are live and
structurally validated, but the progressive-loading half of Phase A did not function in practice. Reporting it
as a success would be false; the honest position is that the knowledge is present and inert until the
loading instruction is fixed.

**Proposed fix, not implemented:** move the pointer to the first action of the procedure, name the directory
the paths resolve against, and add one paid check (3 runs) that the read happens before any other
contribution. No additional references, no longer bodies, no new infrastructure.

## 8. What is unverified

- **Visual quality**: no renderer is available in this environment, so no screenshots exist and no blind
  visual review could be prepared. The anonymised A/B documents are for **requirements-document** review:
  structure, state coverage, copy, accessibility specificity. Visual quality remains unverified, as the skill
  itself requires us to say.
- Design acceptance failed in both arms partly on assertion shape (`## Brief` versus `## 1. Brief`), which is
  the same class of defect recorded in Phase 3; it was frozen and is reported, not adjusted.
- n=3 per scenario. Nothing here supports a quality claim in either direction.

---

## 9. Correction: knowledge delivery

**Three-run mechanism check after moving the pointers early: 0 of 3 runs opened a reference.** Same result as
0 of 18. 3 runs, $0.0037 of the $0.01 cap, `claude-haiku-5-5` low, same sandbox and scenario.

The correction tested: a `## Read before you start` table at line 14 of `SKILL.md`, naming each reference with
the condition that selects it, and instructing the agent to resolve paths against *this skill's directory*
(no machine-specific absolute paths). `skill.json` stayed metadata only.

It did not work. Per the agreed branch, the essential knowledge was **inlined into the bodies**:

| skill | inlined |
| --- | --- |
| `prosci-design` | brief shape, mandatory states with copy, accessibility minimum, hierarchy order, density table, disclosure rule |
| `prosci-ship` | spec fields (goal, non-goals, shape, proof, rollback), test rules, production readiness minimum |
| `prosci-verify` | evidence per check, CLI/HTTP/browser essentials, missing-renderer rule |

References remain as optional depth — typography scales, colour derivation, critique order, motion timing,
longer checklists. `skill.json` records that they are supplements, not the source of rules.

**Interpretation, stated as inference:** with 21 runs at 0 reads across two placements, the mechanism appears
to be that this model does not fetch companion files for a task it believes it can answer from the skill body.
The hybrid architecture keeps the rules in front of it; the references are for the cases where the body says
"for depth, read X" and the task visibly exceeds the checklist. That has not been measured and is not claimed.

Lint now enforces the shape: a declared reference must be named in the first 45 lines, and hard-coded
machine paths are rejected. Two new tests (10 total for the lint).
