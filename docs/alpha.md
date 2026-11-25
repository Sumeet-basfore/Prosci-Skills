# Prosci alpha

An experimental workflow for coding agents: seventeen small skills that make an agent state a goal, pick
a route, verify by running, and land small changes. Use it if you are comfortable reading diffs and
recovering from an agent doing the wrong thing.

## What works (measured)

- A one-line instruction in a repo's `AGENTS.md` naming the matching skill loaded the right route in
  **11 of 15** runs in the frozen evaluation. Passive discovery alone was **0 of 15**.
- Route selection, downstream loading and workflow adherence are measured separately; loading a skill is
  not evidence that it was followed (`eval/reports/phase-0.2.md`).
- Installing into five harness directories works at the filesystem level. Discovery and behaviour are
  verified only on pi (`docs/supported-harnesses.md`).
- Boundary checks: 44 routing scenarios, 17 rows, 8 negative, no failures. That tests the table, not a
  model.

## What does not work, or is unverified

- **Activation is unreliable.** Seven in ten at best, on synthetic tasks with a cooperative instruction.
- **Artifact quality is mostly unproven.** Three assertion attempts in three phases measured phrasing
  rather than substance; the failures are in the reports, not hidden.
- **Merge escalates a constraint violation** instead of resolving it. Known limitation, three runs,
  documented in `eval/reports/phase-3.md`.
- No real-repository trial has been completed with a human reviewer. Until one is, treat the workflow as
  promising rather than proven.

## Install

```sh
git clone <this repo> && cd prosci
bin/install-skills --check
bin/install-skills --harness pi        # or --target <dir> --copy
```

Then either invoke a skill by name (`/skill:prosci-ship`) or add one line to the repo you are working in:

> Before you change any code in this repository, read the single `prosci` skill that matches this request
> and follow it.

## Remove

```sh
bin/install-skills --harness pi --remove
```

Marker-based: only what the installer created is removed.

## Limitations

Alpha means: watch it. Keep the branch protected, read the diff before merging, and do not point it at
production data. The skills assume a test command exists; a repo without one should start with
`prosci-init`.

## Privacy

No telemetry, no analytics, no identifiers, no accounts, no update checks. Nothing Prosci installs makes
a network request; that is checked by `eval/harness/audit-network.mjs` in CI and inventoried in
`docs/network-inventory.md`. Your coding harness and model provider do see the conversation and files —
that is their data flow, not this project's. Evaluation evidence stays on the machine that produced it.
