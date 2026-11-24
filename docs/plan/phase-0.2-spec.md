# Phase 0.2 — Entry-point architecture and evaluation calibration

**Status:** proposed. No paid runs, no skill edits, no code changes until this is reviewed.
**Predecessor:** `phase-0.1.md` — activation measured, target not met. Nothing here claims it is solved.
**Model for all comparable arms:** `anthropic/claude-haiku-5-5`, thinking `low`. Fingerprints recorded per series.

---

## 0. What this milestone is, and what it refuses to be

Phase 0.1 established that prosci is inert when nobody names it, and that naming it works better than
any prompt injection tried so far. This milestone answers one question — **what is the smallest entry
point that reliably delivers a route?** — and then stops.

It is not a benchmark-building programme. Every experiment below has a pre-registered stop, a run
ceiling, and a decision it feeds. If the answer arrives at experiment 1, experiments 2 to 4 are not
run.

## 1. What the existing artifacts already establish

Read from the stored JSONL, no model calls. Counts are reads of `skills/prosci*/SKILL.md`, deduplicated
by file per run.

| arm | runs reading the router | runs reading a route | conversion |
| --- | --- | --- | --- |
| S3 one line in repo `AGENTS.md` | 10 / 15 | 7 / 15 | 70% |
| S4 Pi extension, sentence injected into the system prompt | 9 / 15 | 3 / 15 | 33% |
| S2 `/skill:prosci`, body inlined into the user message | n/a (inlined) | 1 / 15 | 7% |

Three facts, and one non-fact:

1. **The router is reachable in every arm.** In S2 the body is in the prompt; in S4 and S3 the agent
   reads the file itself. Reaching the router is not the failure.
2. **Delivery position correlates with the second hop.** The same sentence produces 70%, 33% and 7%
   depending on where it arrives. This is a correlation across three arms with 15 runs each; it is
   not yet a controlled result.
3. **`act-explain` never activates in any arm, including the two that instruct an explicit read.** The
   activation sentence begins "Before you change any code", and a question changes no code. That is a
   wording defect in the instruction, not model behaviour, and it is cheap to test.
4. **Not established: why S3 converts at 70% and S4 at 33%.** They differ in delivery position *and*
   in what the agent can see — in S3 the sentence lives in the repo the agent is already reading. Any
   claim that "tool-result delivery works" would be an inference, and this milestone tests it rather
   than repeating it.

## 2. Direction: an explicitly activated mode

Adopted as the architectural premise, on the evidence that passive discovery is not a product
requirement we can meet.

- **Entry.** The user enters prosci deliberately: a slash command, a one-line instruction in the repo,
  or an explicit mode toggle. Passive discovery stays as a best-effort extra, not a promise.
- **Progressive loading.** The router is loaded first and alone. A route is loaded only when the
  request selects it. `prosci-bar` loads once per session at the end of the first route, as today.
- **Individually callable.** Every skill keeps `name` and `description` and stays directly reachable.
  Hiding skills is **not** adopted: PStack hides 29 of 38, and no measurement here supports hiding as
  a reliability mechanism. If experiment 2 shows hiding helps, it becomes a hypothesis for 0.3, not a
  change in 0.2.
- **No new layer.** No daemon, no runtime dependency, no per-harness generator, no compatibility
  shim, no new skill.

## 3. Isolation is the gate, not a task in the list

**Correction to both earlier reports.** `PI_CODING_AGENT_DIR=/home/sumeet/.pi/agent` is exported in
this shell, and `getAgentDir()` prefers it over `$HOME`. Every run so far therefore read the real
credential store while the harness copied `auth.json` into a throwaway HOME and audited that copy.
The audit passed against a file nothing used. Proven by pointing that variable at an empty directory:
authentication fails, zero tokens, the directory stays empty.

This is a material security issue and it blocks further model-driven shell runs.

**Required before E1 runs a model:**

1. Both `HOME` and `PI_CODING_AGENT_DIR` point at the run's temp directory; `-ne` disables extension
   discovery.
2. The run executes inside `bwrap` (present on this machine) with `--clearenv`, a read-only bind of
   the interpreter and node, a writable bind of the fixture only, and a bind of the scoped agent
   directory. No host home, no `/home/sumeet/personal-repo`, no SSH directory.
3. **Negative tests, run before every series and failing the series if any passes:**
   `cat $HOME/.ssh/id_*` fails, `ls /home/sumeet` fails, `cat /home/sumeet/.pi/agent/auth.json` fails,
   `env` contains no variable matching `*KEY*|*TOKEN*|*SECRET*` beyond the single provider credential
   deliberately passed in.
4. The scope of what is passed in: one provider credential. Nothing else. If a run needs a second
   service, that is a new discussion, not a flag.

Until (3) passes in the same commit, Phase 0.2 executes no agent shell.

## 4. Experiments, with limits and a stopping rule

Per-run cost from Phase 0.1 is $0.0008 (15 runs ≈ $0.012). Estimates below use it.

| # | question | design | runs | est. cost | decision it feeds |
| --- | --- | --- | --- | --- | --- |
| E1 | Why does the same sentence convert at 70%, 33%, 7%? | same sentence, three delivery positions (repo `AGENTS.md`, system prompt, user-message prefix), 5 activation scenarios × 3 reps | 45 | $0.04 | which entry mechanism to ship |
| E2 | Does the instruction wording cause the `act-explain` failure? | two wordings ("before you change any code" vs "any request about this codebase") on the explain and negative scenarios, best position from E1, 3 reps | 18 | $0.015 | whether the router needs a scope clause |
| E3 | Does progressive loading cost anything? | router-only vs router+route delivery, 3 scenarios × 3 reps, best position | 18 | $0.015 | whether the mode loads the route up front |
| E4 | Is a dispatcher needed? | only if E1's best position is below 12/15 leaf loads: a ~60-line `bin/prosci-route <route>` that resolves and prints the route body, 5 scenarios × 3 | 15 | $0.012 | build or drop the only new executable |
| E5 | Are the scenarios discriminating? | 4 candidate tasks, vanilla passive × 3 each, keep only tasks where vanilla scores < 4 in ≥ 2 of 3 | 12 | $0.010 | the Phase 1 scenario set |

**Totals:** 108 runs maximum, $0.092 estimated, **hard cap $0.15** enforced by the runner's
`--max-cost`. Nothing runs beyond the cap, including retries; a series that hits the cap is recorded
as truncated.

**Stopping rule, in order:**

1. If E1's best position reaches ≥ 12/15 leaf loads *and* ≥ 12/15 correct routes, stop. Ship that
   entry mechanism. Skip E2–E4.
2. If it reaches ≥ 9/15, run E2 and E3 only. Skip E4.
3. If it is below 9/15, run E4 once. If E4 also fails the threshold, **stop evaluating and ship with a
   documented limitation** — no third mechanism, no new harness capability.
4. E5 runs regardless, because Phase 1 needs a scenario set that is not at ceiling.

"Fails the threshold" always means: fewer than 12 of 15 runs load the correct route. No redefining the
threshold after seeing results; if it changes, the change and its reason go in the report.

## 5. The dispatcher, specified before it is justified

Written down now so it cannot grow later. `bin/prosci-route <route>`:

- 60 lines of Node, no dependencies, no network, no state.
- `prosci-route list` prints route names with their trigger phrases.
- `prosci-route <name>` prints that route's `SKILL.md` body and exits 0; unknown names exit 2 and list
  the valid ones.
- Tests: valid name, unknown name, `list`, and a check that the printed body matches the file hash.

It exists only if E4 runs, and it is justified only if prompt-only delivery stays under threshold. Its
value is that it removes two failure modes at once — resolving `../prosci-fix/SKILL.md` relative to the
router, and deciding which file to open — not that it "dispatches" anything. A CLI prints to a tool
result; it is the same delivery channel a `read` uses, and the report must say so rather than imply the
dispatcher is a stronger mechanism.

## 6. Calibration, without manufacturing difficulty

Phase 0.1's six harder scenarios were still at ceiling (6 of 7 at 4.00) for Haiku 5.5 low. The cause is
task difficulty against the model, not scenario shape, and the fix is calibration, not inflation.

- **Source.** Four tasks taken from real, open work in this repo or `forge`, not invented puzzles.
- **Shape.** Multi-file change, a requirement stated in prose, an existing test that must keep passing,
  and one constraint from the repo's own `AGENTS.md`.
- **Acceptance.** The project's own test command plus one test that fails before the change. Acceptance
  runs independently of the agent, as now.
- **Selection.** A task stays only if vanilla-passive scores below 4 in at least 2 of 3 runs. Tasks that
  everyone passes are recorded as ceiling and dropped. **No task is edited to make vanilla fail.**
- **Separation.** Calibration runs are not activation runs and are never pooled with them.

## 7. Measurements that stay separate

Carried forward from Phase 0.1, unchanged, because collapsing them is how the earlier phases produced
flattering numbers:

`routerRead` · `routeRead` · `routeCorrect` · `workflowAdherence` · `taskCorrectness` · `unnecessaryActivation` ·
`tokens` · `cost`

Loading is not adherence. A named invocation is not passive selection. Adherence and correctness are
scored by the harness, not by the agent's own report.

## 8. Exit criteria

Phase 0.2 is done when all of these are true, and is not extended past them:

1. Isolation negative tests pass inside the sandbox, and are re-run before each series.
2. One entry mechanism is chosen with a measured conversion rate and a stated interval.
3. The `act-explain` failure is explained or fixed, with evidence.
4. The routing table is either shown sound under the chosen entry or a defect is filed. S3's 70% alone
   already argues the table works; S4's 33% says the delivery does, so the difference is reported, not
   smoothed.
5. A calibrated scenario set exists: 4 tasks, each with a recorded vanilla baseline below ceiling.
6. A report states conversion for activation, route selection, loading, adherence and correctness
   separately, keeps every negative result, and says plainly whether the entry point is reliable
   enough to build on.
7. Total spend ≤ $0.15 and total runs ≤ 108.

**Out of scope, explicitly:** new skills, hiding skills, a daemon, a mandatory runtime, a Pi extension,
per-harness generators, model changes, thinking-level changes, and Phase 1.

## 9. Smallest viable architecture, if E1 lands well

```
user request
   │  one explicit line: "read <router path> and follow the route it selects"
   ▼
prosci  (router: five non-negotiables + route table, ~90 lines)
   │  table row names one route file; paths resolve against the router's own directory
   ▼
prosci-<route>  (loaded on demand, one route per request)
   │
   ▼
prosci-bar  (once per session, at the end of the first route)
```

That is the whole architecture: three levels, one file per level, no runtime. Everything else in this
document exists to find out whether the first arrow can be made reliable without adding to it.

## 10. Change list, if approved

| file | change | size |
| --- | --- | --- |
| `eval/harness/sandbox.sh` | bwrap wrapper, scoped env, negative tests | ~40 lines |
| `eval/harness/behaviour.mjs` | `--sandbox`, `--variant <name>`; reuse everything else | ~30 lines |
| `skills/prosci/SKILL.md` | add one sentence on path resolution against the router's directory | 1 line |
| `eval/scenarios/activation/*.json` | two instruction variants, one scope clause | 2 files |
| `eval/scenarios/calibrated/*` | 4 tasks with reference solutions | new dir |
| `bin/prosci-route` + test | only if E4 runs | ~60 lines |
| `docs/plan/phase-0.2-spec.md`, `eval/reports/phase-0.2.md` | this proposal and its result | docs |

No other file changes. If a change is not in this table it needs its own justification in the report.
