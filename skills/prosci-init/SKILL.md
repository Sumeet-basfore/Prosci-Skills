---
name: prosci-init
description: "Set up a repo for agent work from evidence: run the read-only survey, interpret it, recommend a configuration, get explicit approval, write the minimum, and validate it. Use when starting a project, or adopting a repo whose instructions or commands are missing or wrong."
---

# Init

The failure this route prevents: an agent "sets up" a repo by writing a plausible `AGENTS.md` with
commands nobody ran, adding a lint config nobody asked for, and calling it ready.

Init starts from facts. `bin/prosci-survey` reports what the repo actually is; init interprets that report,
recommends a configuration, and writes only what a human approves.

## When this runs

- A new project has no instructions and no way to verify changes.
- An adopted repo's `AGENTS.md` names commands that do not run.
- A repo is missing a test command, CI, or a `.gitignore` that keeps secrets out.
- Someone asks what a repo is and what it would take to work in it.

## When it does not

- **The repo is already set up and the commands run.** Nothing to do; say so and stop.
- **You need to understand unfamiliar code.** `prosci-understand` builds the model. Init consumes facts; it
  does not read the codebase for meaning.
- **One change in a working repo.** `prosci-ship` / `prosci-fix`.
- **A design or architecture decision.** `prosci-design` / `prosci-architect`.

## Inputs

- The repository path.
- `bin/prosci-survey <repo>` output — the facts. If the tool is unavailable, say so and stop rather than
  guessing the stack from file names.
- The user's intent: new project, adoption, or repair.

## Procedure

### 1. Survey, then read the facts back

Run `bin/prosci-survey <repo>`. Then state, in the reply, the parts that decide the setup:

- stacks and manifests, and any `null` lockfile;
- each detected command **with its source** (`AGENTS.md` block, manifest script, CI) and whether it is
  verified;
- test dirs and frameworks, CI files, existing instruction files;
- risks by code (`no-test-command`, `no-instructions`, `no-ci`, `dirty-tree`, `env-not-ignored`);
- `unknowns` — say them out loud, do not fill them in.

If `commands.test` exists but is unverified, run it once before recommending anything. A command that does
not run is the finding, not a detail.

### 2. Recommend, from the rule table — not from taste

Recommendations are mechanical, keyed on risk codes and stacks:

| finding | recommend |
| --- | --- |
| `no-instructions` | add an `AGENTS.md` with the verified commands; route a `prosci-understand` pass for conventions |
| `no-test-command` | add the smallest test harness the stack supports, then a test that passes |
| `no-ci` | one workflow that runs the verified commands (only if the repo has a remote) |
| `env-not-ignored` | `.gitignore` entry; stop and flag if a secret is already committed |
| `no-lockfile` | install and commit the lockfile before any dependency work |
| `empty-test-dir` | write one real test; an empty directory is not a harness |

Recommended skills and roles come from the survey (`recommendedSkills`, `recommendedRoles`). Do not invent
a longer list; a repo with a working test command does not need `prosci-init` at all.

Model budget profile: only if the user asks, and only from an explicit tiers file. Never infer a model from
its name, and never read a credential store.

### 3. Show the exact change, then ask

Present the diff you intend to write:

- the file, the section, and the exact lines;
- what you will not touch;
- what remains unknown and who can resolve it.

Then **stop and ask for approval.** Do not write before an explicit yes. Recommendations are not changes:
`prosci-init` never modifies project configuration on its own, and a repo with no approval gets a report,
not a patch.

### 4. Write the minimum

Only after approval:

- `AGENTS.md` with the verified commands in the factory block, and nothing else;
- never overwrite an existing file — propose a patch to the section that needs it;
- never add a dependency, a framework, a CI pipeline or a config file nobody asked for.

Copy the commands exactly as they were verified, including the working directory if it matters.

### 5. Validate

Run each command the new instructions claim. Paste the output. Then run
`bin/prosci-survey <repo>` again and confirm the risk codes that motivated the change are gone. A command
that passes only because of a local file is not verified.

### 6. Make it reversible

State how to undo the setup: the files added, and the one-line command or instruction to remove them. A
setup a person cannot reverse is a setup they will not approve.

## Output

- the survey facts that decided the setup, with sources and unknowns;
- the recommendation, mapped to risk codes;
- the approval request and its answer;
- the files written, or "no change, awaiting approval";
- verification output for every command claimed;
- the reversal instruction;
- what remains unverified.

## Failure handling

- **Survey unavailable.** Stop. Do not reconstruct its output by hand.
- **No test command and no tests.** Say the repo cannot be verified yet; propose the smallest harness as its
  own change and wait for approval. Do not write code to make a test pass.
- **The existing instructions are wrong.** Propose a diff to them; do not silently replace the file.
- **Approval is not given.** Report what you would have changed and stop. No partial writes.
- **A secret is committed.** Stop immediately, name the file (not the value), and hand off to the owner. Do
  not add it to `.gitignore` and call it fixed.

## Approval guarantees, stated honestly

The approval gate is **instruction-level**: the agent asks and waits. Nothing in the tooling forces it —
`bin/prosci-survey` is read-only and cannot write, but the write itself is the agent's action. Treat the
gate as a workflow rule backed by review, not as a sandbox. If executable enforcement is needed, it belongs
in a tool that performs the write itself, which does not exist yet.

## Acceptance criteria

1. The survey was run, and its facts (with sources) are quoted in the report.
2. Unknowns are listed, not filled in.
3. Every recommended change maps to a risk code or a stated user intent.
4. No file was written before an explicit approval.
5. Every command claimed in the instructions was executed, and its output pasted.
6. The survey was re-run and the motivating risk codes are gone.
7. The change is reversible, with the reversal written down.
