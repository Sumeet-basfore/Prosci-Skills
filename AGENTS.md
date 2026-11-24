# prosci

This repo holds two things. `docs/research/` is the research on software factories that
started it. `bin/` is the factory itself, the gate and the record that every other repo in
`/home/sumeet/personal-repo/projects` is now measured against.

`docs/plan/factory-v1.md` owns the phases, their evidence boxes, and what stays unproven. Read
it before changing what the tools do.

## What the tools are

`bin/context-doctor` reads each repo's `AGENTS.md` factory block and proves statically that its
commands resolve against that repo's own toolchain. It never executes anything, so it is safe
on a fresh clone.

`bin/verify` runs the block, stops at the first failure, and appends one JSON line to
`~/.local/state/factory/verify.jsonl` with the repo, commit, dirty flag, per-command exit and
duration, and a receipt id. That receipt is the evidence a reviewer reruns.

`bin/install-gate` writes the server-side workflow into a repo so its pull requests get a check
named `factory`, then prints the branch protection command. The check lives on GitHub, where a
change to the repo cannot edit it.

Node only, no dependencies, no build step. Tests use `node:test`.

```factory
test: node --test bin/test/*.test.mjs
```

## Rules

- New behaviour in `bin/` gets a test in `bin/test/` in the same commit. Tests drive the CLIs
  and assert exit codes and receipt contents. Do not assert on internal helpers.
- No new dependency. If a check needs a library, it belongs in a shell command inside the
  repo's block instead.
- Nothing here may silently pass. A missing block, a missing `test` command, or a command that
  does not resolve is a failure, never a warning.
- `bin/context-doctor` stays static.
- Commit in small units, each green on its own. Then `bin/verify .` and paste the receipt id in
  your reply.

## Layout

```
bin/context-doctor          static contract check across repos
bin/verify                  runs a repo's block, writes the receipt
bin/install-gate            writes the GitHub workflow into a repo
bin/lib/factory-block.mjs   the one parser every tool shares
bin/test/                   behaviour tests, node:test
bin/templates/              the block format and the workflow, for humans
docs/plan/factory-v1.md     phases, evidence, open items
docs/research/              the report and mind map that motivated this
.agents/skills/             59 pstack skills, local to this repo, gitignored
```

## What the research argues

Worth knowing before you extend the tools, because the plan takes its shape from it.

- The closed loop is context, specification, execution, governance, measurement, with
  production defects feeding back into context and specification. Most teams build the top row
  and skip the feedback edges.
- Oversight is reallocated, not removed. Hours saved by the agent writing code go into writing
  the spec and reading diffs.
- Graduated oversight: reversible work ships on green checks, work touching money, secrets,
  published data, or destructive migrations gets a cold second read.
- The report is written for organisations buying tools for hundreds of engineers. Signed
  artefacts, in-toto layouts, reproducible builds, and CPU pinning do not transfer to one
  person. The plan says which parts do.
