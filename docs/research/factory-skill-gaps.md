# Skill gaps in the factory

Research run 2026-11-24 by a Codex worker on this machine, reading the five factory skills, the
v2 orchestrator note, the software factory report, pstack's mode and its 22 playbooks, and Forge's
eleven procedures. Read-only. Its output arrived in four chunks and never settled, so the operator
assembled this note. The judgement at the end is the operator's, not the worker's.

The question it was given: which skills are missing, where a skill earns a place only if it
prevents a specific failure the current five let through.

## What it found

Four gaps, with the worker's priority in brackets.

### 1. `prosci-investigate` [1]

A read-only route for questions about behaviour, architecture, or tradeoffs.

The failure: a user asks why a subsystem behaves a certain way, the router sends the request down
`prosci-ship` because the scope is unclear, and the agent edits code when the user wanted an
explanation. Nothing in the five skills covers a request that should change nothing.

Overlap it named: `prosci-fix` investigates a bug it intends to fix, and `prosci-review`
evaluates a diff. Neither has a route for a question with no change attached.

Built. See `skills/prosci-investigate/SKILL.md`.

### 2. `prosci-release` [2]

Preparing a versioned release, package, tag, or publication.

The failure: tested code is released with the wrong version, a user-facing change missing from the
changelog, or an artifact nobody verified. `prosci-ship` ends at merge, so everything after merge
is currently unwritten.

Its content sketch: check the release branch, clean tree, and full verification; choose the
semver bump from the changes; update version metadata and the changelog; build and inspect the
artifact; require explicit authorization before tagging or publishing.

### 3. `prosci-docs` [2]

Documentation-only work, or changes that affect docs, examples, or setup instructions.

The failure: a command or a default changes and the README, the example, or the setup guide still
describes the old behaviour. This is the most common real defect in a personal repo, because the
docs are the only onboarding path and they are never exercised.

Its content sketch: identify the audience and the source of truth; update the docs, examples, and
links; check each claim against current behaviour and run the documented commands where that is
practical.

### 4. `prosci-init` [3]

Creating a project, or onboarding a repo that has no usable conventions.

The failure: scaffolding overwrites existing configuration, or work starts in an empty repo with
no runnable baseline, so the first change has no test command to verify against.

Its content sketch: inspect the target and preserve existing files, config, and history; establish
only the layout and the project instructions that are needed; record the tool commands and verify
the baseline runs.

## What it deliberately left out

Its own words: planning, architecture, testing, and ordinary orchestration either repeat the
current ship and review routes, or need runtime support the factory does not have. The report also
notes the five skills already hold a strong bar for changes, fixes, and review, so it stopped at
four.

## The operator's read

- `prosci-investigate` was the right first call. The misroute it prevents is the one that wastes
  the most time, and the route is cheap to write. It is built and merged.
- `prosci-release` earns a place only when something actually publishes. For a repo with no
  version, no package, and no tag, it is ceremony. Build it when the first package ships.
- `prosci-docs` is the strongest of the remaining three, and it is also the smallest. A
  documentation route that requires running the documented command would have caught the
  `.venv/bin/pytest` and template-metadata bugs found earlier today, both of which were
  documentation and packaging drift rather than logic errors.
- `prosci-init` overlaps with step 1 of `prosci-ship`, which already writes the commands into
  the repo's instructions when they are missing. Promoting that to its own skill is justified only
  if new projects are frequent.

Recommended order: `prosci-docs`, then `prosci-release` when a package exists, then
`prosci-init` if new repos start appearing.

## A note on the worker

The dispatch ran four turns and ended each one mid-report without calling `worker_done`, so the
same escalation fired four times and the report arrived in pieces. The output was correct and
useful; the protocol was not honoured. Worth knowing before dispatching longer writing tasks to
this worker setup, and the reason this note exists in the repo rather than in a message.
