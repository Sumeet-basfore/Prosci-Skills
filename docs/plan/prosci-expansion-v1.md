# Prosci expansion, v1

Written 2026-11-24. Audit, research, gap analysis, and a plan for approval. No skill was changed to
produce this.

## 0. Approved, 2026-11-24

Four decisions and five constraints. This section overrides anything below that disagrees with it.

**Decisions.**

1. The 17 plus 3 structure is accepted. Twenty is not a target. A future skill needs a demonstrated
   gap and an evaluation that justifies it.
2. `prosci-design` is product surface only. API contracts, system boundaries, and architectural
   decisions stay with `prosci-architect`.
3. Phase 0 is the mandatory first milestone. No new skill is written until the evaluation foundation
   exists and the current nine have been measured.
4. Phase 0 includes a minimal installer and compatibility validation. Discovery, relative reference
   resolution, install, update, and safe removal get verified per harness. Unsupported capabilities
   get documented, not implied.

**Constraints on the evaluation.**

- It measures more than routing: negative routing, implementation quality, verification integrity,
  token overhead, completion time, scope compliance, cross-harness consistency, regressions.
- Deterministic routing tests are separate from probabilistic model-behaviour evaluations.
- Scenarios are reproducible, outcomes are defined before a run, fixtures are controlled, scoring is
  transparent.
- Three configurations where practical: no Prosci, the current nine skills, the expanded set. The
  current version is preserved as a reproducible baseline.

**What stays from the audit.** Deterministic routing, shared engineering principles, repository-owned
knowledge, dependency-aware planning, minimal runtime. Verified delivery is the primary objective.
Token efficiency and throughput are measured, never assumed.

**What is explicitly not optimised.** Commit volume, skill count, evaluation scores for their own
sake.

## 1. What exists today

Measured from the repo, not from memory.

| what | count | size |
| --- | --- | --- |
| skills | 9 | 952 lines |
| router | 1 (`prosci`) | 93 lines, 8 routes |
| route links | 8 of 8 resolve | relative `../prosci-x/SKILL.md` |
| optional gate tools | 3 CLIs + 1 shared parser | 768 lines with tests |
| tests | 21 | `node --test bin/test/*.mjs`, run by CI and by the gate |
| docs | 2 plans, 2 research notes, 1 review record | |
| CI | one workflow, check named `factory` | runs the repo's own contract |
| history | 15 commits, 14 merged PRs | every one gated |
| always-on context cost | 2,649 characters of descriptions | ~660 tokens per session |

Architecture in one paragraph. A router skill holds five non-negotiables and a table that maps
intent to a route. Each route is a single SKILL.md with the same section shape: steps, per-stack
specifics, evidence rules, and a link to `prosci-bar`, which is the shared definition of done. No
skill calls another at runtime, no skill needs a command from this repo, and every link is relative
so the whole folder can be installed as one unit. `bin/` is optional evidence tooling, not part of
any route.

What the repo has proven, from this session's history.

- The gate catches real defects. It found two documentation and packaging bugs that had been live
  for weeks in two other repos, plus one Node version portability bug in this one.
- A review with a numeric threshold works. Two skills scored under 8, one router defect was the
  cause of both, and the fix moved them to 9.3 and 9.2.
- Sub-8 scores were not cosmetic. Both were the same misroute: a behaviour change could land on the
  docs route alone.

What it has not proven.

- That the skills change agent behaviour. Zero behavioural tests exist. The 9.3 is a rating of
  prose, not of outcomes.
- That the router picks correctly under real requests. It has never been tested against a
  misroute.

## 2. What the reference ecosystems do

Measured from the copies installed on this machine.

| | skills | total lines | runtime | router | install |
| --- | --- | ---: | --- | --- | --- |
| prosci | 9 | 952 | none | `prosci`, table + rules | symlinks into `.agents/skills` |
| pstack | 59 skills, 22 playbooks | 441 for mode + playbooks | none | `poteto-mode`, table + 24 principles | per-harness generated tree |
| gstack | 54 skills | 66,440 | a compiled browser daemon, telemetry, a bash preamble | `gstack`, intent router | per-harness install with a `setup` script |

Three conclusions, each with its evidence.

**Length is not quality, and it is not free.** pstack routes 22 playbooks from a 110-line mode
skill because each playbook is 8 to 25 lines. gstack has 66,440 lines for 54 skills, and it needs a
generator to keep them consistent (`do not edit directly, regenerate`). Prosci sits between them at
~105 lines per skill. The detail in `prosci-ship` (168 lines) is the most a single route should
carry before it should be split.

**Ecosystems grow from a runtime, not from a skill count.** gstack's skills exist to drive a
browser. pstack's exist to be read by a chat. A suite that plans to reach 70 skills either adds a
runtime or becomes a library nobody loads. Prosci has chosen no runtime, which caps its realistic
size.

**Per-harness compatibility is a build step, not a convention.** Both references generate or
install per harness. Prosci currently relies on relative sibling links, which survive a folder copy
but break the moment skills are flattened into a harness that reads `.claude/skills` or a package
with a different layout.

## 3. What is missing, ranked by evidence

Not by intuition. Each gap names the failure it lets through today.

| gap | the failure today | evidence |
| --- | --- | --- |
| no planning route | a large request goes to `prosci-ship`, which starts coding at step 4 with a three-line spec and no dependency plan | `prosci-ship` says "settle the scope in step 2", which is a sentence, not a plan |
| no architecture route | types and module boundaries are sketched inside `prosci-ship` step 3, in a reply, and forgotten | step 3 exists but has no artifact, no comparison of shapes, no record |
| no behavioural test of the skills | a skill can be rated 9.3 and still fail to change behaviour | zero tests; the review measures prose |
| no install story | the same nine skills must be re-linked by hand per harness | `.agents/skills` symlinks, plus `AGENTS.md` instructions |
| no refactor route | a behaviour-preserving reshape is forced into `prosci-ship`, where "smallest diff" and "converge on a target shape" contradict | ship forbids unrelated edits, so a clean refactor cannot pass its own rules |
| no verify-by-driving route | box 2 of the bar asks for the real surface, and nothing owns it | `prosci-bar` step 6, and no route for browser, CLI, or E2E evidence |
| no assumption challenge | the premise behind a plan is never attacked outside `prosci-fix` | nothing owns "is this the right problem" |
| no merge route | stacked PRs, rebases, and conflicts have no procedure | ship ends at one merge |

## 4. Evaluation of the eleven proposals

Verdicts are mine, with the reason. The names came from the brief; where I would change a
responsibility, I say so.

| proposal | verdict | reason |
| --- | --- | --- |
| `prosci-understand` | **keep, renamed scope** | distinct from `prosci-investigate`. Investigate answers one question. Understand builds a working model of an unfamiliar repo and writes it into the repo's instructions so the next agent inherits it. Keep the name, define the output as a context artifact, not a chat answer. |
| `prosci-architect` | **keep** | the missing artifact for step 3 of ship. Types, boundaries, two candidate shapes, one chosen with a reason. Recording it is what makes later review possible. |
| `prosci-plan` | **keep, small** | decomposition, dependency graph, and the parallel unit list. This is where `prosci-parallelize` belongs. |
| `prosci-challenge` | **keep, sharpen** | adversarial review of a plan or design, not of a diff. Review reads a diff. Challenge reads a proposal and tries to break the premise. If it also reviews diffs, the two collide and the router will pick wrong. |
| `prosci-parallelize` | **fold into plan and ship** | parallelism is a property of a plan, not a task. A user does not ask to "parallelize"; they ask for speed. As a standalone skill it would fire on almost nothing, and its content is a table that `prosci-plan` needs anyway. |
| `prosci-build` | **drop** | it is `prosci-ship` under a second name. Two routes for one intent is the drift this suite has already been fixing. |
| `prosci-tdd` | **fold into fix and ship** | `prosci-fix` step 3 already mandates the failing test first, and `prosci-ship` step 5 mandates a test that can fail. A third skill that says "write the test first" would create three sources for one rule, and a router that cannot choose between them. pstack keeps `tdd` separate because its bug-fix playbook is 15 lines. Ours carries the rule inline. |
| `prosci-refactor` | **keep** | genuinely missing, and it contradicts `prosci-ship` if forced through it. Its constraint, behaviour preserved and pinned by a characterization test, is the opposite of ship's "add behaviour". |
| `prosci-design` | **keep, define as product surface** | if it means UI and interaction, it is missing today. If it means API shape, it is `prosci-architect`. The skill must name product surfaces only: flows, states, copy, accessibility, and the empty and error states. |
| `prosci-verify` | **keep, define as driving the surface** | `prosci-bar` box 2 asks for evidence; nothing owns producing it. Verify is the route for browser, CLI, and end-to-end evidence: drive the real thing, capture it, paste it. Without this scoping it duplicates the bar. |
| `prosci-integrate` | **rename `prosci-merge`** | "integrate" reads as integration tests to one reader and as merging to another. The real missing procedure is rebases, stacked PRs, cross-repo consumers, and conflict resolution. Name it for that. |

Net: eleven proposals become eight skills, because three are duplicates or facets of one.

## 5. The proposed 20

Seventeen core, three held back until an eval justifies them.

| # | skill | route it fires on | state |
| ---: | --- | --- | --- |
| 1 | `prosci` | any request, routes it | exists |
| 2 | `prosci-bar` | the end of every route | exists |
| 3 | `prosci-understand` | unfamiliar repo, build a model | new |
| 4 | `prosci-investigate` | one question about behaviour | exists |
| 5 | `prosci-plan` | multi-step work, dependency order, parallel units | new |
| 6 | `prosci-architect` | shape before code, types and boundaries | new |
| 7 | `prosci-design` | product surface, states, copy, accessibility | new |
| 8 | `prosci-ship` | add or change behaviour | exists |
| 9 | `prosci-fix` | broken behaviour, test first | exists |
| 10 | `prosci-refactor` | behaviour preserved, structure moved | new |
| 11 | `prosci-challenge` | attack a plan or design | new |
| 12 | `prosci-review` | a diff, before merge | exists |
| 13 | `prosci-verify` | drive the real surface, capture evidence | new |
| 14 | `prosci-docs` | documentation claims | exists |
| 15 | `prosci-release` | version, artifact, publish | exists |
| 16 | `prosci-init` | new or unadopted repo | exists |
| 17 | `prosci-merge` | rebase, stack, conflict, consumers | new |
| 18 | `prosci-security` | a diff or a release touching trust boundaries | held |
| 19 | `prosci-perf` | a measured regression or a budget | held |
| 20 | `prosci-incident` | something is down, now | held |

Why the held three. Each is a real route, and each has a narrow trigger that may fire a handful of
times a year. A skill that fires twice a year still costs description tokens in every session and
still competes in the router. The test for promotion is in section 8: build it when the eval shows a
request that should have fired it and no route caught it.

Why not 70. The always-on cost scales with the count: 2,649 characters today, roughly 660 tokens
per session, and a 70-skill suite would be 5 to 7 thousand tokens of descriptions before any work
starts, plus routing ambiguity that grows faster than linearly. gstack pays 66,440 lines and a
generator to keep 54 skills consistent. Prosci has no generator. The honest ceiling without one is
about 20, and the honest move at 20 is to deepen routes, not add them.

## 6. The router

The brief asks for an orchestrator that analyses intent, project context, task complexity, and
engineering risk, then sequences skills on its own. Half of that is cheap and half of it is
untestable, so the plan splits it.

What the router does deterministically today, and keeps doing: one table lookup from intent to
route, plus two stacking rules (docs after behaviour, fix then review).

What the plan adds, as three questions the router asks itself, each with a defined answer:

1. **Does this change code?** No, and it is a question, so `prosci-investigate`. No, and it is
   documentation, so `prosci-docs`.
2. **Is the shape known?** If not, `prosci-plan` then `prosci-architect` before any code.
3. **Is it reversible?** If not, an approval checkpoint before the irreversible step, which is
   `prosci-release`'s existing behaviour.

That is a decision table an eval can test. A model asked to "score complexity and risk" produces a
number nobody can reproduce, and the first time it routes a data deletion to a patch-level route,
the whole thing loses credibility.

What the router must not do: pick skills nobody can predict. If a user says "fix this bug" and the
router answers with a five-skill plan, it has failed. One route, named, before work starts.

## 7. Architectural decisions this plan makes

**No runtime.** Worktrees are git commands an agent already runs. Persistent knowledge is a file in
the repo that the harness already reads. No daemon, no database, no CLI in any route. `bin/` stays
optional and out of the workflow.

**One install unit.** The skill folder is the unit. Installation is a copy or a link of
`skills/prosci*` into the harness's skill directory, keeping the siblings together so relative
links resolve. A small installer script is justified only when a second harness is actually used,
and it will be generated from one source, not hand-maintained per harness.

**Knowledge lives in the repo's instructions file.** `prosci-understand` writes what it learned into
`AGENTS.md` (or the repo's equivalent), which every harness already loads. A `docs/knowledge/` tree
per project would be a second place to look and a second place to rot.

**Evidence is files and pasted output, not telemetry.** The bar asks for pasted commands and
results. The optional gate writes receipts to a local JSONL. No accounts, no uploads.

**The bar is the single definition of done.** Every new route links to it. No route defines its own
quality bar, or the suite drifts into twenty slightly different bars.

## 8. Evaluation, before more skills

The next skill added should be justified by a failing eval, not by a gap table. The harness:

1. **Seeded scenarios.** Per route, 5 to 10 real requests taken from this machine's history, each
   with a known correct route and a known wrong route. Example: "the template loader returns nothing
   on a fresh clone" must route to `prosci-fix`, not `prosci-investigate`.
2. **Pass predicate.** The agent names the right route, follows its steps, and produces the
   evidence the bar requires. Route choice and evidence are both checkable.
3. **Baseline.** Run the same scenarios against a no-skills agent. The difference is what the suite
   is worth. Without this, every score is a rating of prose.
4. **Regression.** Re-run after any skill edit. A skill that loses a scenario gets rebuilt, exactly
   as the two sub-8 skills were.

Promotion rule for the held skills: a scenario that should fire a held skill and no route catches
it, observed twice, promotes it. Nothing else does.

## 9. Phases

Each phase ends in a merged pull request and a re-run of the eval.

| phase | content | why this order |
| --- | --- | --- |
| 0 | eval harness and baseline, install note in README | without this, every later phase is unmeasurable |
| 1 | `prosci-plan`, `prosci-architect`, `prosci-understand` | the pre-code trio, each unblocks the others, and they take pressure off the 168-line ship route |
| 2 | `prosci-refactor`, `prosci-challenge`, `prosci-verify` | the three routes that fix contradictions the current nine carry |
| 3 | `prosci-merge`, `prosci-design` | lower frequency, and design needs a decision about product surface work |
| 4 | router questions, held-skill review | only after the eval can tell whether routing changed |

Deliberately last: enlarging the router. A router change with 17 skills and no eval is the largest
untested risk in the plan.

## 10. Assumptions I am challenging

- **"20 core skills is the target."** It is a convenient number. The defensible target is "every
  route has a failure it prevents and an eval that proves it", which today would be 15 to 17.
- **"Intelligent orchestration means risk scoring."** It means reproducible routing. A table and
  three questions are testable. A similarity model is not.
- **"Parallel development is a skill."** It is a planning decision and a git procedure. Worktrees
  appear in `prosci-plan` (which units are independent) and `prosci-merge` (how they land).
- **"More skills means more capability."** Past roughly 20, each added skill costs tokens in every
  session and lowers routing accuracy. The evidence is gstack's generator and pstack's 8 to 25 line
  playbooks, both of which exist to fight that cost.
- **"Throughput and token consumption both improve."** They trade off. This plan picks verified
  delivery as the primary, and accepts that evidence costs tokens. Say so now, so a later report
  does not pretend otherwise.
- **"Harness independence is a convention."** It is a build step. Until an installer exists, the
  claim is aspirational and should be written as such.

## 11. Decisions, resolved

The four questions this plan opened are answered above in section 0. Recorded here with the
alternative that was not taken, so the reasoning survives.

| question | answer | the road not taken |
| --- | --- | --- |
| 17 plus 3, or force 20 | 17 plus 3 | padding three skills to hit a number, each one costing description tokens and router ambiguity |
| scope of `prosci-design` | product surface only | splitting API design out of architect, which would have made two skills argue over one decision |
| phase 0 first | mandatory | writing the eight skills first, which would have made every later result unmeasurable |
| installer now | yes, minimal, in phase 0 | relying on symlinks until a second harness, which would have left compatibility unverified and untested |

## 12. Next

`docs/plan/phase-0-spec.md` is the implementation specification for the approved phase 0. It is a
proposal for review, not an approved plan, and nothing in it is built yet.
