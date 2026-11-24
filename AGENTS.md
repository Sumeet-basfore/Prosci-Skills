# prosci

The software factory. Skills in `skills/`, workflow in the skills, research and history in
`docs/`.

## How to use it

Any agent working anywhere should start at `skills/factory/SKILL.md`. Say "use the factory" or
name a route directly.

- `factory` routes and holds the non-negotiables
- `factory-ship` adds or changes behaviour
- `factory-fix` fixes a bug, test first
- `factory-review` reviews a diff before merge
- `factory-bar` is the definition of done every route ends at

The skills are the product. `bin/` is optional evidence tooling: `context-doctor` proves a
repo's commands resolve, `verify` runs them and writes a receipt, `install-gate` puts the same
check on GitHub. Nothing in the workflow requires running any of them.

## Rules for changing this repo

- A skill changes behaviour or it gets deleted. Prose that restates the code, the type, or the
  command earns nothing.
- Every skill names its route by path. No restating another skill's steps, no copying them.
- New behaviour in `bin/` gets a test in `bin/test/` in the same commit. Tests drive the CLIs
  and assert exit codes and output, never internal helpers.
- No new dependency.
- Commit in units, each green. Then state the commands you ran and their output.

```factory
test: node --test bin/test/*.test.mjs
```

## Layout

```
skills/          the factory itself: factory, ship, fix, review, bar
bin/             optional gate and receipt tools
bin/test/        tests for those tools
docs/plan/       phases, evidence, open items
docs/research/   the report and mind map the design came from
```

## What the research says, in case it matters

Context, spec, execution, governance, measurement, with defects feeding back into context and
spec. Oversight is reallocated rather than removed: hours saved writing code go into the spec and
into reading diffs. Reversible work ships on green checks; work touching money, secrets,
published data, or destructive migrations gets a cold second read.
