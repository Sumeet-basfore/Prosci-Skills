# prosci

A software factory you use by asking for it. Seventeen skills, one workflow, an optional survey and a
plan-bound multi-agent runner. The workflow is what makes agents ship more without shipping worse; the
evidence for that claim is incomplete, and is recorded honestly below.

Skills live in `skills/` and are linked into `.agents/skills/`, so any agent in any project
finds them.

| skill | when |
| --- | --- |
| `prosci` | the routing index. Optional entry point, holds the non-negotiables |
| `prosci-understand` | building a working model of a repo you have not worked in |
| `prosci-architect` | choosing a shape: boundaries, interfaces, two options, one decision |
| `prosci-plan` | splitting work into ordered, verifiable units and the parallel set |
| `prosci-refactor` | improving structure while proving the behaviour did not change |
| `prosci-challenge` | attacking a proposal before it becomes code |
| `prosci-verify` | producing evidence from the real surface |
| `prosci-merge` | integrating branches, worktrees or stacked pull requests and verifying the combined state |
| `prosci-design` | user flow, states, accessibility, responsive behaviour and product copy |
| `prosci-ship` | building a feature or changing behaviour |
| `prosci-fix` | fixing a bug or a failing test |
| `prosci-review` | reviewing your own work or someone else's before merge |
| `prosci-investigate` | answering a question about behaviour with evidence, without changing code |
| `prosci-docs` | updating the documents a change made wrong |
| `prosci-release` | preparing a release and its conditions |
| `prosci-init` | giving a repo a short, verified instruction file |
| `prosci-bar` | the definition of done every route ends at |

Say `/skill:prosci` to see the routes, or name the skill you want. The measured entry point is a
one-line instruction in the repo's `AGENTS.md` pointing at the matching skill: in the frozen
evaluation that loaded the right route in **11 of 15** runs, which is useful but not reliable. See
`eval/reports/phase-0.2.md`. Loading a skill is not the same as following it, so verify the work, not
the activation.

## Start here

- `docs/alpha.md` — what works, what does not, install, remove, privacy.
- `docs/supported-harnesses.md` — the five harness directories and what is actually tested.
- `docs/network-inventory.md` — every network path, and the limits of the check.
- `docs/plan/v2-complete.md` — the capability inventory, what was demonstrated, what is unproven, and the
  freeze rule.

## Private preview

The seventeen skills are feature-frozen while a seven-day preview runs on real work. Protocol and record
template: `docs/preview/README.md`. Public alpha is deferred until a human-reviewed result has merged.

## Install

The seventeen skills are one folder. Copy or link `skills/prosci*` into the directory your harness reads,
keeping them together so the relative `../prosci-x/SKILL.md` references resolve.

```sh
bin/install-skills --check                    # what is installed where, changes nothing
bin/install-skills --harness pi               # link into ~/.agents/skills
bin/install-skills --target <dir> --copy      # copy into any directory, for a sandbox
bin/install-skills --harness pi --remove      # remove only what this script installed
```

The installer refuses to overwrite or delete anything it did not create, keeps a copy you edited,
repairs an interrupted install, and verifies that every route link resolves after installing.

Compatibility is three separate claims and they are not the same claim:

| harness | skills directory | files | discovery | behaviour |
| --- | --- | --- | --- | --- |
| pi | `~/.agents/skills` | verified 2026-11-24 | explicit `--skill` only | measured: 11/15 route loads |
| claude | `~/.claude/skills` | verified 2026-11-24 | not tested | not tested |
| codex | `~/.codex/skills` | verified 2026-11-24 | not tested | not tested |
| cursor | `~/.cursor/skills` | verified 2026-11-24 | not tested | not tested |
| opencode | `~/.config/opencode/skills` | verified 2026-11-24 | not tested | not tested |
| omp | no skills directory found | unsupported | not applicable | not applicable |

Files verified means the files land, the names match, and every relative reference resolves.
Discovery means the harness itself loads them. Behaviour means the harness follows them; only pi has
been measured, and 11/15 is not reliability. Nothing here claims a harness works beyond its column.

## Use it

### One-time setup

```sh
bin/install-skills --check                 # see what is already installed; changes nothing
bin/install-skills --harness pi            # pick one: pi, claude, codex, cursor, opencode
bin/install-skills --check                 # expect 17 skills and no broken links
```

Add `--copy` with `--target <dir>` instead of `--harness` when you want the files inside a project or a
sandbox. To remove them later, `bin/install-skills --harness <name> --remove` deletes only what the
installer created.

### Everyday use

Name the skill that matches the job. This is the reliable path: the harness loads that file, and the file
tells the agent what to read, run and prove.

```text
/skill:prosci-fix the checkout test fails after the currency change
/skill:prosci-ship add CSV export to the reports page
/skill:prosci-review review my uncommitted diff
/skill:prosci-verify prove the endpoint returns 429 under the limit
```

If you do not know which one, ask for the router and let it choose a route:

```text
/skill:prosci the import job now times out on large files
```

The router is an index, not a guarantee. If the route it names looks wrong, name the route yourself.

### Make it fire without being named

Agents often ignore installed skills. The best measured fix is one line in the repository's own
instruction file (`AGENTS.md` or `CLAUDE.md`):

```text
Before you change code here, read the single prosci skill that matches this request and follow it.
```

That loaded the right route in 11 of 15 frozen runs; passive discovery loaded none. Put it in the repo
where the work happens, not in your global config.

### Start in an unfamiliar repo

```sh
bin/prosci-survey .            # read-only facts: stacks, commands with sources, tests, CI
bin/prosci-survey . --verify   # also run the detected test command
/skill:prosci-init             # turn the facts into a short, approved AGENTS.md
```

`prosci-survey` never opens a credential store and prints `null` with a reason when it cannot determine
something. `prosci-init` writes nothing until you approve the diff.

### Plan-bound multi-agent work (advanced, opt-in)

```sh
bin/prosci-swarm check plan.json          # roles, models, budgets, dependencies
bin/prosci-swarm hash plan.json           # approval is bound to this exact plan
bin/prosci-swarm-run plan.json --approve <hash> --backend fake   # no model calls
```

Read `docs/plan/e2-parallel-proposal.md` and `docs/security.md` before using `--backend pi --allow-paid`:
real execution needs a proxy, a request budget, and a boundary you have verified. Worktrees isolate files,
not credentials, and the controller's limits bind a cooperative worker rather than hostile code.

### Use it well

- Ask for one route per task. Two goals in one request usually get one of them.
- The route states its own verification. Run it; do not accept “tests pass” without the output.
- Loading is not adherence. Read the diff and the command output, not the skill's presence.
- When a skill's advice is wrong for the repo, follow the repo and record the mismatch — that is the only
  authorized reason to change Prosci now (see `docs/plan/v2-complete.md`).

## The workflow, in one screen

1. Read the repo's own instructions and find its real test command.
2. Write the spec in three lines: goal, acceptance, out of scope.
3. Name the data shape before the logic.
4. Make the smallest diff that works.
5. Make a test that fails when the behaviour breaks.
6. Run the commands and paste the output, then drive the real surface.
7. Commit in units, one idea each.
8. Open a pull request with `Why`, `What changed`, `Scope`, `Verification`, review your own diff,
   merge on green.

The bar is six boxes: does the thing, checks really ran, a test would catch regressions, the
smallest diff, the change is explained, nothing hidden.

## What is here, and what it is not

`bin/` holds an optional gate. `bin/context-doctor` proves a repo's declared commands resolve,
`bin/verify` runs them and writes a receipt, `bin/install-gate` puts the same check on GitHub.
The factory works without any of it; the gate turns "I ran the tests" into something a reviewer
can rerun. Use it when you want the evidence, skip it on a scratch project.

`docs/plan/` holds the phases and their evidence, `docs/research/` the report that started it.
Neither is part of the workflow.

Node only for the optional tools. No dependencies, no build step.

```factory
test: node --test bin/test/*.test.mjs
```

## Privacy

Prosci is local. It sends nothing: no analytics, no identifiers, no accounts, no update checks, and no
network request from anything it installs. That is verified by `eval/harness/audit-network.mjs`, which
runs in CI, and inventoried in `docs/network-inventory.md`.

The coding harness and model provider you use see the conversation and the files — that is their data
flow, not this project's. The one outbound path in this repo is `eval/harness/proxy.mjs`, used only by
evaluation runs to keep the provider key outside the sandbox; no skill calls it.

## Project survey

`bin/prosci-survey <repo>` reports what a repo is — stacks, commands with their source, tests, CI, harnesses,
model providers — as JSON. Read-only, deterministic, and it never opens a credential store. `prosci-init`
consumes it, recommends a configuration, and writes nothing until you approve.

```sh
bin/prosci-survey .            # facts only
bin/prosci-survey . --verify   # also runs the detected test command
```

Same repo in, same JSON out; every field carries a `source`, and what it could not determine is `null` with
a reason.

## Multi-agent plans

`bin/prosci-swarm check <plan.json>` validates a structured plan against `agents/` (8 roles, model
capabilities, budget profiles). `bin/prosci-swarm-run` executes one after approval by plan hash: dependency
order, bounded concurrency, one worktree per unit, ownership checks, controller-run acceptance, per-unit
deadlines, cancellation and resume.

Real execution has run end to end: a three-unit plan completed 3/3 units on pi/Claude Haiku 5.5 (E2,
11 requests, ~$0.00136), and the economy arm of E3b completed 3/3 (17/24 requests, ~$0.00119). The
mixed-model arm did not produce a valid comparison. The controller bounds executions, requests and retries
through a single-use authorization record and an atomic proxy budget; that is enforcement against a
cooperative worker, not an OS sandbox. Worktrees isolate files, not credentials — see `docs/security.md`.

Direct skill injection (placing assigned skill bodies in the worker prompt) exists and is **opt-in**. The
L-001 comparison was inconclusive: 9 of 12 runs completed before the request cap, and its one acceptance
difference came from a hidden citation convention.

## Skill packages

Each skill is a folder: `SKILL.md` holds the procedure, decision rules and mandatory requirements;
optional `references/` files hold domain knowledge at the point of need; `skill.json` declares the triggers
and which reference to load when. Only three skills use references today (`design`, `ship`, `verify`) — the
rest are single files, and that is fine. `eval/harness/skill-lint.mjs` checks the format in CI.

## What is measured

Activation is not solved. A one-line instruction in the repo's `AGENTS.md` loaded the right skill in 11
of 15 runs in the frozen evaluation; passive discovery alone was 0 of 15. Loading is not adherence.

Execution and model-mixing are mechanisms, not proven improvements. The only real-repo pilot passed 1 of
3 issues in both the 9-skill and 17-skill arms — no measured difference. Direct injection is
inconclusive (L-001). Mixed-model role assignment is unproven (E3b). See `eval/reports/phase-0.2.md`,
`phase-4.md`, `l001.md`, `e3b.md`, and the summary in `docs/plan/v2-complete.md`.
