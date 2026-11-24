---
name: factory-ship
description: "Build a feature or behaviour change the factory way: read the repo's instructions, settle the spec, make the smallest diff, test the behaviour, verify by running, and land it through a pull request. Use when the request adds or changes behaviour."
---

# Ship a change

You own the change from intent to merge. The order below is the work. Skipping a step is a
choice to name out loud, not a shortcut to take quietly.

## 1. Read the repo before the request

Open the repo's `AGENTS.md` or `CLAUDE.md`. Find the real commands for test, typecheck, and
build. If the file names a `factory` block, those are the commands; run them and paste the
output, do not invent your own.

No commands written down anywhere means step one is to find and run them yourself, then write
them into the file so the next agent does not repeat the search.

## 2. Write the spec in three lines

```
goal:       what changes for the user
acceptance: how you will know, as a command or an observable
out of scope: what this change will not touch
```

If the request cannot fill these three lines, ask one question about the specific fork and stop.
Do not ask three questions and do not guess a scope that changes the design.

## 3. Name the data shape before the logic

For anything with state, write down the fields and the states they can be in, or the table, or
the reducer, before writing branches. Scattered booleans become a bug farm. If the change
crosses a function boundary or a module boundary, sketch the types and the call shape first and
show the sketch in your reply.

## 4. Implement the smallest diff

Touch what the change needs and nothing else. No drive-by formatting, no renamed file, no new
dependency for a few lines, no wrapper with one caller. If you spot unrelated rot, note it and
leave it, or ship it separately.

## 5. Test the behaviour

At least one test fails when the behaviour breaks and keeps passing when only the internals
change. Drive the public surface with a concrete input and derive the expected value from the
requirement, not from the code you just wrote.

Skip a new test only when the change is genuinely not testable, and say so in the pull request.
Saying "not testable" is a claim a reviewer can dispute.

## 6. Verify by running it

Run the repo's commands, in full, and paste the output. Not a summary of the output. If a
command does not exist, say that instead of silently skipping it.

When the change is user visible, also drive the real thing: the page, the CLI, the endpoint.
A green suite and a broken surface is the failure this step exists to catch.

## 7. Commit in units

One commit per idea, each green on its own. Message: `type(scope): subject` with the reason in
the body when it is not obvious. Never commit a mixed bag because the clock ran out.

## 8. Land it

```sh
git push -u origin <branch>
gh pr create --base <default-branch> --fill
```

Body, in this order, empty sections dropped: `Why`, `What changed`, `Scope`, `Verification`.

Then read your own diff as a reviewer would. When the checks are green and the diff is what you
intended, merge. Squash. Delete the branch. Require a green check, never override a red one.

## Reply

The goal, the diff size, the commands and their result, the pull request link, and anything you
chose not to do.
