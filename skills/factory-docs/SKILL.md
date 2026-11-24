---
name: factory-docs
description: "Change documentation the factory way: find every claim the change invalidates, update it, run the commands you document, and check the links. Use for documentation-only work, or as the second half of a behaviour change that altered a command, a flag, a default, a config key, or setup steps."
---

# Change documentation

Documentation is the only onboarding path most repos have, and nothing exercises it. A README
that names a command nobody runs rots silently until someone follows it and fails.

This route exists because the two most common real defects in a personal repo are not logic
errors. They are a documented command that no longer works and a default that changed while the
example stayed the same.

It runs after the behaviour change, not instead of it. Documentation is a claim about code, so a
change to the code comes first, merges, and then the documentation is brought back in line. The
exception is documentation that is wrong today with no code change behind it.

## 1. Name the audience and the source of truth

- Audience: the next agent, a future you in six months, or a stranger. Write for the weakest of
  the three that will read it.
- Source of truth: the code, the config, or the tests. Documentation is a claim about one of them.
  When they disagree, the code wins and the doc is wrong.

If a repo has one instructions file, that file is the source of truth for how work is done. Do not
create a second one beside it.

## 2. Find every claim the change invalidates

Do not browse the docs. Search for the specific tokens the change touched.

```sh
rg -n '<the command>|<the flag>|<the default>|<the file path>' --glob '*.md'
```

Then check the places that carry claims without the token:

- the quick start and the install section, which name a command and a version,
- examples and snippets, which are the code most likely to be stale,
- a config file or `.env.example`, which the prose describes,
- the changelog or release notes, if the repo keeps them,
- comments in the code that describe behaviour, not implementation.

List what you found before editing. That list is the diff.

## 3. Update, do not add

Rewrite the stale sentence. Do not append a new paragraph beside it, or leave the old one with a
note. Two explanations of the same thing is how docs start disagreeing with themselves.

- Keep the reader's order: what this is, how to run it, what you should see.
- Show a command and its output. A command with no expected output is a command the reader cannot
  check.
- Delete a section that describes something that no longer exists. Deleting is the fix, not
  losing history. Git has the history.

## 4. Run what you documented

For every command you write, run it. Paste the result in the pull request.

- If the command needs an environment, say how to get it in the same block.
- If it needs a value only the reader has, use a clear placeholder and name it.
- If it cannot run on a clean checkout, that is the finding. Fix the command or write down the
  dependency.

Documentation that has never been executed is a guess with formatting.

## 5. Check the links and the paths

Every relative link resolves, every referenced file exists, every anchor still points at a
heading that exists. A moved section breaks an anchor silently.

```sh
rg -n '\]\(([^)]+)\)' --glob '*.md'
```

Check the referenced paths with `ls` or `test -f`, one by one. This step takes a minute and catches
the most embarrassing class of docs bug.

## 6. Read it as a newcomer

Read the changed sections top to bottom, pretending you have never seen the repo. Where do you get
stuck? Where does the doc assume something it never established? Fix those places, and stop there.
Rewriting the whole page is a separate change.

## 7. Land it

Documentation gets the same treatment as code: a branch, a pull request, a description that says
which claims were wrong, and the output of the commands you ran. It ends at
`../factory-bar/SKILL.md` like every other route, with box 3 satisfied by the command output rather
than a test.

If the repo has no checks, say so in the pull request.

## Reply

The audience, the claims you found with their locations, what you rewrote, the commands you ran
with their output, the links you checked, and what you left for a later change.
