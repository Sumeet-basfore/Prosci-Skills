# prosci

A software factory you use by asking for it. Five skills, one workflow, no CLI to learn. The
workflow is what makes agents ship more without shipping worse.

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
| pi | `~/.agents/skills` | verified 2026-11-24 | not tested | measured in phase 1 |
| claude | `~/.claude/skills` | verified 2026-11-24 | not tested | measured in phase 1 |
| codex | `~/.codex/skills` | verified 2026-11-24 | not tested | measured in phase 1 |
| cursor | `~/.cursor/skills` | verified 2026-11-24 | not tested | measured in phase 1 |
| opencode | `~/.config/opencode/skills` | verified 2026-11-24 | not tested | measured in phase 1 |
| omp | no skills directory found | unsupported | not applicable | not applicable |

Files verified means the files land, the names match, and every relative reference resolves.
Discovery means the harness itself loads them, which phase 0 does not test. Behaviour means the
harness follows them, which is measured from phase 1. Nothing here claims a harness works beyond
its column.

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

## Skill packages

Each skill is a folder: `SKILL.md` holds the procedure, decision rules and mandatory requirements;
optional `references/` files hold domain knowledge at the point of need; `skill.json` declares the triggers
and which reference to load when. Only three skills use references today (`design`, `ship`, `verify`) — the
rest are single files, and that is fine. `eval/harness/skill-lint.mjs` checks the format in CI.

## What is measured

Activation is not solved. A one-line instruction in the repo's `AGENTS.md` loaded the right skill in 11
of 15 runs in the frozen evaluation; passive discovery alone was 0 of 15. See `eval/reports/phase-0.2.md`
and `phase-3.md` for what is measured, what failed, and what is still unproven.
