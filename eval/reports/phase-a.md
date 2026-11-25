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
