---
name: prosci-understand
description: "Build a working model of an unfamiliar repository from evidence, and persist only the verified, durable parts into the repo's existing instructions. Use when you must change or judge code in a repo whose commands, conventions and structure you have not verified."
---

# Understand

The failure this route prevents: an agent opens an unfamiliar repo, guesses the commands and
conventions from the file names, edits three files, and only then discovers the tests run with a
script it never found. The next agent repeats the whole discovery.

Understand turns a one-off look around into a small, verified model that the repo keeps.

## When this runs

- You are about to change code in a repository you have not worked in before.
- The repo's instructions are missing, stale, or do not match what the code does.
- A change failed in a way that suggests you misunderstood the project's structure.

## When it does not

- **One question about behaviour.** That is `prosci-investigate`: answer it, change nothing, stop.
- **An empty repo, or one with no usable conventions.** That is `prosci-init`: create the minimum.
- **A repo you already have a verified model of.** Go to `prosci-ship` or `prosci-fix`.
- **Reviewing a diff.** `prosci-review` reads the diff, not the whole project.

## Inputs

- The repository path.
- The change or decision you are preparing for. "Understand everything" has no stopping rule; a goal
  does.
- The existing instruction files, if any: `AGENTS.md`, `CLAUDE.md`, `README.md`.

## Procedure

1. **Read before writing.** In this order, and stop when the model closes:
   instruction files, README, manifest and lockfile, CI config, the top-level tree, the tests that
   cover the area you will touch, then three to five source files on the path from entry point to the
   thing you will change.

2. **Run the commands.** Execute the repo's test, typecheck and build commands as written. Quote the
   real output. If a command fails on a clean checkout, that is a finding, not a reason to pick a
   different command.

3. **Draw the model at three levels.** Entry points (how the code is invoked), boundaries (modules and
   what each owns), state (data, files, environment). Name the two or three places where a change will
   have non-local effects.

4. **Collect constraints, not preferences.** Conventions the code actually enforces: error handling
   style, naming, layering, generated files, anything a linter or test will reject. Separate them from
   style you merely noticed.

5. **Persist only what is durable.** Write into the instruction file that already exists, as a
   `## Working model` section or into the section it belongs to. Cap the addition at 25 lines.
   Include: the verified commands, the module boundaries in one line each, the conventions a change
   must follow, and the areas with no tests.
   Exclude: anything you inferred but did not check, anything already in the README, secrets,
   environment values, and file-by-file descriptions that will be stale in a week.

6. **Name the unknowns.** End with what you could not verify and what would settle it. An honest gap
   is worth more than a confident guess.

## Output

- A short briefing in the reply: entry points, boundaries, commands with their observed result,
  conventions, risks, unknowns.
- A small patch to the existing instruction file. No other file changes.

## Failure handling

- **A command does not run.** Record it as unknown with the error. Do not substitute a command you
  invented; the next agent would inherit a fiction.
- **No instruction file exists.** Create `AGENTS.md` with only the verified commands, then continue.
  If there is no test command at all, stop and route to `prosci-init`: the repo cannot be verified.
- **The repo is too large to read.** Follow only the path from the entry point to your intended change,
  and say which parts you did not read.
- **The instructions contradict the code.** The code wins. Fix the instruction and say what was wrong.

## Acceptance criteria

1. Every command written into the instruction file was executed in this session, with its output
   quoted in the reply.
2. The patch touches one file and adds at most 25 lines.
3. No secret-shaped value appears in the patch (no key, token, password, connection string).
4. No paragraph is copied from the README; the model adds what the README does not say.
5. The unknowns are listed explicitly.
6. A reader who has never seen the repo could run the test command from the file alone.
