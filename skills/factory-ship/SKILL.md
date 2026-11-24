---
name: factory-ship
description: "Build a feature or behaviour change the factory way: read the repo, settle the spec, name the data shape, make the smallest diff, test the behaviour, verify by running, commit in units, and land through a pull request. Use when the request adds or changes behaviour."
---

# Ship a change

You own the change from intent to merge. These ten steps are the work. Skipping one is a decision
to name out loud, not a shortcut to take quietly.

## 1. Read the repo before the request

Read, in this order:

1. `AGENTS.md`, `CLAUDE.md`, or the repo's equivalent. It carries the commands and the house
   rules.
2. A `factory` block if there is one. Those are the exact commands. Use them.
3. `package.json` scripts, `pyproject.toml`, `Cargo.toml`, `Makefile`, or `go.mod`, whichever
   the repo has. Write down the test, typecheck, and build command.
4. One existing file that looks like the file you will touch. Match its style, its error
   handling, and its naming.

No commands written down anywhere means your first commit writes them into the repo's
instructions. The next agent should not repeat this search.

Do not invent a command. If you cannot find a test command, run one candidate and show the
output. "There was probably a test suite" is not a finding.

## 2. Write the spec in three lines

```
goal:         what changes for the user, one sentence
acceptance:   how you will know it works, as a command or something a person can observe
out of scope: what this change will not touch
```

Rules for the spec:

- Acceptance is checkable by someone else. "Login works" is not acceptance. "Posting valid
  credentials to /login returns 200 and sets the session cookie" is.
- Out of scope is a real list. It stops the fourth idea that arrives while coding.
- If the request cannot fill these three lines, ask one question about the specific fork, then
  stop and wait. One question. Not three, and not a guess that changes the design.

Put the spec at the top of your reply. It is the thing the pull request `## Why` will restate.

## 3. Name the data shape before the logic

Before branches, write down what the data is.

- State with more than one dimension: write the states and the legal transitions, or use a
  tagged union. Scattered booleans become a bug farm, because they allow states that should not
  exist.
- More than about three cases on one field: write the table, the registry, or the enum, then the
  code reads it. A chain of `if`s that repeats the same shape is a table in disguise.
- Crossing a function or module boundary: sketch the types and the call shape first. Put the
  sketch in your reply, two to five lines, so a wrong boundary is caught before the code exists.

If two shapes are both reasonable, pick the one where each piece of state has one owner and the
caller has to know least. Say why in one line.

## 4. Make the smallest diff that works

Before writing, list the files you expect to touch. Then:

- Touch those, and nothing else. No drive-by formatting, no renamed file, no reordered imports
  in a file you only read.
- No new dependency for a few lines. Check the standard library and the local code first.
- No abstraction with one caller, no config option with one value, no interface with one
  implementation.
- Note unrelated rot you pass. Leave it, or ship it as its own change. Do not fix it inside this
  diff.
- Keep values in the shape the platform gives you. Do not add a conversion layer.

If the diff grows past roughly 300 changed lines, stop and ask whether it is two changes.

## 5. Make a test that can fail

For each acceptance line, at least one test.

- Assert what a user of the code observes: a return value, an error, a written row, a response,
  a rendered element. Not a private helper, not an internal call order.
- Drive the public surface with a concrete input. Derive the expected value from the requirement,
  not from running the code you just wrote and copying its answer.
- Pair each "never happens" with a case where it does happen. A test that only proves the happy
  path proves half a behaviour.
- Assert the error type the caller branches on, not the message text.

Check the test the way a reviewer would. Imagine two edits: break the behaviour, and the test
must fail. Move the internals around, and it must still pass. A test that survives the first edit
proves nothing.

Some changes genuinely cannot take a test: a copy tweak, a colour, a third-party outage path.
Name those in the pull request and say why. "Not testable" is a claim a reviewer can dispute.

## 6. Verify by running it

Run, in this order, and paste the real output, not a summary:

```sh
<typecheck>            # if the repo has one
<test>                 # the full command, not one file, unless the suite takes minutes
<build>                # if it produces an artifact the change affects
```

Then drive the surface a person uses. The page, the CLI command, the endpoint, the job. A green
suite with a broken surface is the exact failure this step exists to catch.

Report failures with the command and the output. Do not describe a failure you did not see.

## 7. Commit in units

One commit per idea. Each commit leaves the suite green on its own, so a reviewer can bisect.

```
type(scope): subject in the imperative

Why the change is needed, in one paragraph. What it does not do, when that matters.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`. Never commit a mixed bag
because the clock ran out.

## 8. Open the pull request

```sh
git push -u origin <branch>
gh pr create --base <default-branch> --fill
```

Body, in this order, empty sections dropped:

```markdown
## Why
The goal from step 2, and what happens today without this change.

## What changed
The files and the shape of the change. Not a narration of your session.

## Scope
What this deliberately does not touch.

## Verification
The commands, the result, and how the surface was driven. Real output, not a claim.
```

Keep it under 40 lines. Long evidence goes in a comment or a linked file.

## 9. Review your own diff

Read `git diff <base>...HEAD` as if someone else wrote it. Run
`../factory-review/SKILL.md` on it. Fix what you find before asking anyone else.

## 10. Land it

Merge only when the checks are green and the diff is what you intended. Squash. Delete the
branch. A red check is reported, never overridden.

If the repo has no checks, say so in the pull request, and let the human decide.

## Before you report

Run the steps in `../factory-bar/SKILL.md`. Six boxes, each true or explicitly unmet.

## Reply

The goal, the route, the diff size in lines, the commands you ran with their output, the pull
request link, and what you chose not to do.
