# prosci

A software factory you use by asking for it. Five skills, one workflow, no CLI to learn. The
workflow is what makes agents ship more without shipping worse.

Skills live in `skills/` and are linked into `.agents/skills/`, so any agent in any project
finds them.

| skill | when |
| --- | --- |
| `factory` | the entry point. Routes the request and holds the non-negotiables |
| `factory-ship` | building a feature or changing behaviour |
| `factory-fix` | fixing a bug or a failing test |
| `factory-review` | reviewing your own work or someone else's before merge |
| `factory-bar` | the definition of done every route ends at |

Say "use the factory" and the agent starts at `factory`. Say `/skill:factory-ship` to jump
straight to a route.

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
