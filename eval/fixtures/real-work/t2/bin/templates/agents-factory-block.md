# The factory contract block

Every repository that takes part in the factory states its own commands once, in a fenced
`factory` block inside `AGENTS.md`. Two tools read that block. `bin/context-doctor` checks it
statically and never runs a command. `bin/verify` runs it and writes a receipt.

```factory
typecheck: npm run typecheck
test: npm test
test1: npx vitest run {file}
build: npm run build
```

## Keys

`test` is required. The others are optional and run in this order: `typecheck`, `test` (or
`test1`), `build`. A block without `test` is invalid, because a contract that cannot run tests
cannot gate a change.

`test1` is the single-file loop. It must contain `{file}`, and `bin/verify --file <path>`
substitutes the path and runs `test1` instead of `test`. No other key may contain `{file}`.

## Why the commands are written down

The projects on this machine use npm, pnpm, Cargo, Go with a Makefile, and Python with a
virtualenv. No detector gets all of those right, and a detector that guesses wrong produces a
gate that passes for the wrong reason. One line per command in the repo is the smallest thing
that cannot drift from the repo it describes.

## What counts as a failure

A contract error means the block names something that does not resolve, such as `npm run
typecheck` in a package with no `typecheck` script, `make nope` with no such target, or
`pytest` in a repo with no Python project. These fail the doctor and fail `bin/verify` before
anything runs.

A missing environment is a warning, not a contract error. No `node_modules`, no `.venv`, no
`target` directory: the doctor prints a warning and still passes, because a fresh clone is not
a mistake. `bin/verify` is where an unprepared environment becomes a real failure.

## Adding a block

Copy the four lines above, replace each command with the one that actually works in that repo,
then run:

```sh
bin/context-doctor --repos <name>
bin/verify projects/<name>
```

If a repo has no test command at all, leave the block out. The doctor will report it, which is
the honest state, and the fix is to add a test command, not to write a fake one.
