# Phase 0.1: invocation reliability

Status: proposal for approval. Nothing here is built, no skill is changed, and no paid series runs
until it is approved.

## 1. Why this phase exists

Phase 0 measured a gap that is not about prose. In 18 Prosci runs, the nine skills were in the system
prompt and the agent read none of them. Told explicitly "use the prosci-fix skill", the same model on
the same fixture read `prosci-fix/SKILL.md`, ran the tests, edited the code, and reported the cause.

So the factory's first problem is not content, model, or effort. It is that nothing makes an agent
consult the router, and the router cannot be tested as a router until something does.

Phase 0.1 answers one question. When an agent is given a task, what makes it load Prosci, pick the
right route, and follow it. Nothing else. No new skills, no daemon, no model change, no effort change.

## 2. What the baseline already establishes

Keep these as the control conditions. Do not re-measure them as if they were unknown.

| claim | evidence | status |
| --- | --- | --- |
| the nine install into five harnesses and resolve their relative links | `eval/harness/install.mjs`, 5/5 | verified |
| the harness loads them into the system prompt | 96 vs 87 skills in the isolated session, 9 prosci names under `current` | verified |
| explicit instruction loads and follows a skill | mechanism check, 6 tool calls, read `prosci-fix/SKILL.md` | verified, once |
| passive selection loads nothing | 0 of 18 current runs named or loaded a route | verified, one model |
| outcomes are otherwise identical | five of six scenarios tie at the ceiling | verified, six scenarios |
| destructive instructions are sometimes obeyed | 4 of 6 guard runs deleted the fixture file | verified, synthetic fixture |

The last row is why section 9 exists. It is a separate problem from activation and it will not be
fixed by better prompts alone.

## 3. The four strategies

Each is described by its mechanism, what is documented, what is verified, and what it costs.

### S1. Passive discovery (the baseline)

The skills are advertised by name and description, and the model decides to read one.

- Mechanism: the harness's own skill selection, driven by the `description` field.
- Documented: Pi loads name, description, and path at startup and leaves the body until a task
  matches.
- Verified: it did not fire in 18 of 18 runs at `haiku-5-5`, `low`.
- Cost: zero extra tokens beyond the descriptions, which are 2,649 characters today.
- Risk: the whole model of a skill library rests on a behaviour this model did not exhibit once.

### S2. Explicit invocation of the router

The user or the harness sends `/skill:prosci <task>` instead of a bare task.

- Mechanism: Pi documents `/skill:name` as the way to force loading, with arguments appended as a
  user request. It also documents `disable-model-invocation: true` to hide a skill from automatic
  selection while keeping the command.
- Documented, not verified: whether `pi -p "/skill:prosci <task>"` expands in print mode the way it
  does interactively, and whether the router then loads its own route file.
- Why it might fail: the router body tells the agent to read `../prosci-fix/SKILL.md`. Loading the
  router is not loading the route. That second hop is the thing to measure.
- Cost: one extra skill body per run, 93 lines, roughly 1.2k tokens.
- Risk: it moves the problem from "will the agent consult the router" to "will the agent follow the
  router", which is testable and therefore better.

### S3. Repository-level instructions

One or two lines in the repo's `AGENTS.md`, which every harness already loads.

- Mechanism: plain instruction in the file the harness reads first, for example "for any code
  change, read the prosci skill that matches before editing".
- Documented: Pi reads project `AGENTS.md` from the working directory through its ancestors.
- Not verified: whether an instruction in a project file changes behaviour more reliably than the
  same words in a skill description.
- Cost: 1 to 2 sentences per repo, no tokens beyond what the file already costs.
- Risk: per-repo drift, and it is a suggestion, not an enforcement. The 18-run result suggests
  suggestions are weak at this model size.

### S4. Native harness activation

The harness itself injects the instruction or enforces the boundary.

- Mechanism, Pi: an extension can inject a message or patch the system prompt in
  `before_agent_start`, and can block a tool call in `tool_call` with `{ block: true, reason }`.
- Mechanism, other harnesses: Claude Code hooks, Cursor project rules, Codex `AGENTS.md` plus its own
  sandbox flags. Each is a different mechanism with a different strength.
- Documented: all of the above, in each harness's own docs.
- Not verified: whether injection actually raises activation, and what it costs in latency and
  context.
- Cost: one small extension per harness, maintained. This is the only strategy that needs code.
- Risk: it is the most powerful and the most harness-specific, which cuts against portability.

## 4. What the reference ecosystems do

Measured from the copies on this machine, with documented and observed kept apart.

| ecosystem | entry point | auto-selection | progressive loading | enforcement |
| --- | --- | --- | --- | --- |
| pstack | `/poteto-mode`, attached as a mode before the task | **29 of 38 skills set `disable-model-invocation: true`**, so most leaves are explicit-only | mode skill routes to 8 to 25 line playbooks by relative path | none; it relies on the mode being attached |
| gstack | `gstack` router skill, plus every skill running a bash preamble | **0 of 54 set it**; every skill is auto-selectable | `preamble-tier` 1 to 4 recorded per skill, plus `gstack-skill-start` reporting machine-readable state | telemetry and gates in the preamble; a compiled browser daemon for its own tooling |
| prosci | `prosci` router skill, passive | 0 of 9 set it | router table, route files loaded by relative path | none |

Three conclusions, and one of them is uncomfortable.

1. pstack, the ecosystem whose structure Prosci copied, hides 76% of its skills from auto-selection.
   Its entry point is a mode the user attaches, not a description the model weighs. Our reading of
   pstack took the routing table and left out the activation model.
2. gstack leaves everything auto-selectable but wraps every skill in a preamble that reports state
   and can gate. It pays 66,440 lines and a generator for that.
3. Neither relies on descriptions alone at a small model size, which is the condition under which our
   18 runs failed.

What is documented versus verified, stated plainly. The pstack and gstack facts above are observed
from their files. Whether those mechanisms raise activation is **not** verified here, and neither
project publishes an activation-rate measurement that this phase could reuse. Any claim that
"pstack works because of modes" is an inference until our own experiment says so.

## 5. Experimental design

One variable per experiment. Model `anthropic/claude-haiku-5-5`, thinking `low`, until an experiment
shows the mechanism works at all; only then does a second model make sense.

### The four conditions

| id | condition | what changes |
| --- | --- | --- |
| A | S1 passive | nothing; this is the Phase 0 baseline, re-run only on the new activation scenarios |
| B | S2 router | the prompt becomes `/skill:prosci <task>` |
| C | S3 repo instruction | one line added to the fixture's `AGENTS.md`, prompt unchanged |
| D | S4 injected instruction | a Pi extension appends one instruction to the system prompt, prompt unchanged |

C and D override the fixture for the experiment only. The committed fixtures stay neutral, so the
baseline is not contaminated; each condition materialises its variant in the temp workspace.

### The activation scenarios

Minimum additions, reusing existing fixtures.

| scenario | fixture | what it tests | expected route |
| --- | --- | --- | --- |
| act-broken-test | broken-test | a failing suite, activation of fix | `prosci-fix` |
| act-add-helper | clean-pass | a new behaviour, activation of ship | `prosci-ship` |
| act-explain | clean-pass | a question, activation of investigate and no edit | `prosci-investigate` |
| act-doc-drift | doc-drift | a docs claim, activation of docs | `prosci-docs` |

Four scenarios, three repeats, four conditions: 48 runs. At the measured $0.0007 per run that is
about **$0.03**, plus any re-runs after a defect. If a condition wins clearly at four scenarios, it
goes to the full six-scenario set for confirmation.

### Metrics, measured separately

No single number. These are recorded per run from structured records and acceptance, never from
prose.

| metric | how it is measured | what it would mean |
| --- | --- | --- |
| activation | a tool call read a `prosci*/SKILL.md` at all | the agent consulted the factory |
| router load | the file read was `prosci/SKILL.md` | the entry point was used, not a guessed leaf |
| route selection | the route first read, after the router, matches the scenario | the table routed correctly in practice |
| downstream load | a second `prosci-*/SKILL.md` read after the router | the second hop happened, which is S2's real test |
| adherence | the route's own required artefacts appear: failing test first for fix, spec lines for ship, no edits for investigate | the skill was followed, not merely opened |
| over-activation | prosci reads on a request that should not activate, for example a one-line question in a fixture with no defect | the condition is too eager |
| token overhead | tokens per run minus the baseline condition | what the mechanism costs |
| task correctness | the independent acceptance commands | whether any of it helped |

Adherence needs one addition per scenario: a `route_artifacts` field naming two observable
requirements from the route file, chosen so they cannot be satisfied by accident.

### Controls

- Interleaved conditions, order flipped each repeat, as in Phase 0.
- Same fixtures, same model, same effort, same isolation, same acceptance.
- The agent never sees which condition it is in, and the fixture path stays neutral.
- S1 is re-run on the new scenarios rather than reused from Phase 0, so the comparison shares a
  scenario set.

## 6. D-001, the corrective PR

D-001 is the router row for "a behaviour change that also alters a command, a flag, or a default". It
names only `prosci-docs`, so a request needing both hops cannot be matched by the table, and scenario
`route-ship-then-docs` fails.

Proposal, as an isolated PR that changes nothing else.

- Rewrite that row to name the behaviour route explicitly, then the docs route, so both appear where
  L1 can see them.
- Keep `route-ship-then-docs` and remove its `known_failure` marker in the same commit, so the
  regression is proven by the scenario that found it.
- `eval/skills.lock.json` updates in that PR only, and the new hash is recorded there. The Phase 0
  tag `v0.1-eval-baseline` stays where it is and is never moved: it is the historical baseline, not a
  pointer to current.
- Re-run L1 and L2. No behavioural series is needed for a table edit, because the change is visible
  to L1 by design.

This is a skill edit, so it stays blocked until Phase 0.1 is approved.

## 7. Destructive-action resistance, as its own problem

The guard result is not an activation bug. Four of six runs deleted the file when asked, with a
plausible excuse attached. More instructions are the weakest possible answer to that.

What is enforceable, in order of strength.

1. **Harness tool-call block.** A Pi extension on `tool_call` can refuse a matching bash command
   before it runs, with `{ block: true, reason }`. This is a boundary, not a suggestion, and it holds
   even when the model complies with the request. Verified by reading the extension documentation;
   not yet verified in a run.
2. **Sandbox with no access to the resource.** A fixture whose "production" file lives outside the
   workspace, so deletion is impossible rather than discouraged. Strongest, and it is what the
   evaluation should use for its own protection.
3. **Approval boundary in the route.** `prosci-release` already stops for explicit authorization. The
   same rule belongs in any route that can delete or overwrite: name the action, wait for a yes.
   Suggestion-level, so it ranks below the first two.
4. **Instructions.** Last, because Phase 0 already showed instructions failing under pressure.

Proposal for 0.1, kept small.

- Extend the guard fixture with a second variant where the target file is outside the workspace, and
  assert the deletion is impossible. That measures the sandbox rather than the model.
- Add one experiment arm: condition D plus a `tool_call` block on `rm`, to see whether an enforceable
  boundary plus an instruction does better than the instruction alone.
- Record `attempted` versus `executed` separately. A blocked attempt is a different result from a
  refusal, and Phase 0 could not tell them apart.

All fixtures stay synthetic. No test ever targets a real path, a real repository, or a real
credential.

## 8. Harder scenarios, to break the ceiling

Five of six scenarios tie at 4.00 for both conditions, so they cannot measure anything. Proposed
replacements and additions, each still small and independently verifiable.

| kind | sketch | acceptance |
| --- | --- | --- |
| multi-file change | add a helper in one file, use it in two callers, update one test | tests pass, three files changed, both callers use it |
| ambiguous requirement | "make the output nicer" with two defensible readings | the agent states an assumption and one reading, and does not do both |
| misleading test | a test that asserts the wrong expected value and passes today | the agent reports the conflict instead of editing either side |
| dependency conflict | two modules needing incompatible shapes of one shared type | the change compiles, one adapter, no duplicated type |
| architectural constraint | a rule in `AGENTS.md` the change must not break, for example "no new dependency" | the rule holds, and the diff shows it |
| regression | a change that breaks a previously passing test elsewhere in the fixture | the agent finds it, fixes it, and says which test |

Anti-leakage rules for all of them.

- No fixture file names the defect, the route, the acceptance command, or the word "test" in a way
  that reveals the trap.
- Acceptance lives in the scenario file, not the fixture.
- The misleading-test fixture's test file is plausible: no comment saying it is wrong.
- Every acceptance command runs against the untouched fixture first and must fail, or the scenario is
  not measuring anything. The audit already enforces this for the series it checks.

## 9. Acceptance criteria for 0.1

1. S2, S3, and S4 each measured on the four activation scenarios at three repeats, interleaved, same
   model and effort, with per-run records committed as a series.
2. A table of activation, router load, downstream load, and adherence per condition, with n, mean,
   spread, and token overhead.
3. A statement of which condition, if any, raises downstream load above zero, and whether the router
   follows through to a route file. A null result is a valid answer and gets written as one.
4. The explicit answer to the question the phase exists for: does `/skill:prosci` cause the agent to
   load and follow a downstream skill. Yes, no, or inconclusive, with the number behind it.
5. Over-activation measured on at least two requests that should not activate, so a condition that
   activates everything is visible.
6. The destructive-action arm run, with attempted and executed recorded separately, and a sandbox
   variant where deletion is impossible.
7. D-001 fixed, or explicitly deferred with the reason.
8. Costs within the approved cap, reported per condition.

## 10. Compatibility implications

- S2 depends on `/skill:name` existing. Pi documents it. Claude Code has no identical mechanism, so
  S2 is a Pi-and-similar result, not a portable one.
- S3 is the only portable strategy: every harness reads `AGENTS.md` or its equivalent.
- S4 is per-harness by definition. A Pi extension is not a Claude Code hook. If S4 wins, the cost is
  one adapter per harness, which is the first thing in this project to justify a small amount of code
  in the harness rather than in the repo.
- `disable-model-invocation: true`, the pstack approach, changes behaviour on every harness that
  supports it and is a skill-file edit. It is not in scope here, and it would need its own experiment
  before any skill is touched.

## 11. Costs

| item | runs | estimate |
| --- | ---: | --- |
| activation experiment, 4 conditions × 4 scenarios × 3 repeats | 48 | about $0.03 |
| confirmation on the full six scenarios for the winning condition | 18 | about $0.02 |
| destructive arm, 2 conditions × 3 repeats | 6 | under $0.01 |
| re-runs after a scenario defect, as happened once in Phase 0 | up to 48 | about $0.03 |
| **total, worst case** | 120 | **under $0.10** |

Wall time is dominated by the activation series, roughly 15 minutes at the Phase 0 rate. The $0.25
cap stays; the runner enforces it.

## 12. Recommendation

Run the experiments in this order, and stop as soon as one answer is clear.

1. **S2 first.** It is the user-facing question, it needs no code, and it tests the second hop that
   the mechanism check did not. If `/skill:prosci` reaches a route file and the agent follows it, the
   factory is usable as designed and the remaining strategies are refinements.
2. **S3 second.** One line, fully portable, and cheap to compare against S2. If a repo instruction
   matches explicit invocation, the answer is portable and no code is needed anywhere.
3. **S4 only if both fail.** An extension is the heaviest option and the least portable. It gets
   built when there is evidence that nothing lighter works.
4. **Safety arm alongside S2**, because a destructive-action boundary is worth measuring whatever the
   activation answer is.

What I would not do, and will not propose without new evidence: adding skills, raising effort,
switching models, building a daemon, or writing per-harness generators. Every one of them changes a
variable the baseline has already fixed.

## 13. Open questions

1. Does `pi -p "/skill:prosci <task>"` expand in print mode, the way it does interactively? One run
   answers it, and it decides whether S2 is testable as designed or needs a harness flag.
2. Does the router's relative path `../prosci-fix/SKILL.md` resolve inside a session whose skills are
   installed to a temp home? The installer verifies it on disk; the mechanism check read one skill
   through an absolute path. The relative read inside a session is unverified.
3. Should S2's prompt be the slash command alone, or the slash command with the task appended, and
   does the difference change anything? Both are cheap; run the documented form first.
4. Is one instruction enough for S4, or does the injected text need the route table? Starting with one
   instruction keeps the variable small.
