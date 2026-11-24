---
name: prosci
description: "Route any code change through the factory workflow: pick a route, follow it, land it with evidence. Use for any request to build, fix, refactor, or review code, or when the user says 'factory', 'use the factory', or 'ship this properly'."
---

# Factory

One entry point for every code change. Pick a route, follow it, land it with evidence a reviewer
can check.

Read this file fully before the first edit. It is short on purpose. The routes carry the detail.

## What this is for

An agent left alone writes code that compiles and calls it done. This workflow replaces that with
a sequence a reviewer can audit: a stated goal, a named data shape, the smallest diff, a test
that can fail, real output from real commands, one change per pull request, and a diff you read
before merging.

Quality comes from the checks, not from good intentions. Throughput comes from small changes
that land, not from large changes that stall.

## Five non-negotiables

1. **Evidence, not claims.** A suite is green when you pasted the command and its output. "Should
   pass", "compiles", "the types check" are not results. If you did not run it, say you did not.
2. **The smallest change that solves it.** No dependency, abstraction, config, option, or file
   nobody asked for. Delete before you add. A wrapper with one caller is a layer you will later
   have to remove.
3. **One change per pull request.** A fix that also refactors, or a feature that also reformats,
   is two pull requests. A reviewer cannot attribute a regression in a mixed diff.
4. **Never weaken a check to pass.** No lowered threshold, commented assertion, skipped test,
   `|| true`, or catch-all that swallows the error. If the check is wrong, say so and fix the
   check in its own change.
5. **Read before writing.** The repo's own instructions first, then the file you will edit, then
   the callers. Editing a function you have not read is how a fix breaks two other features.

## Route

| the request | route | first step |
| --- | --- | --- |
| build a feature or change behaviour | `../prosci-ship/SKILL.md` | read the repo's instructions |
| fix a bug or a failing test | `../prosci-fix/SKILL.md` | reproduce it |
| review a diff or a pull request | `../prosci-review/SKILL.md` | read the diff, then the surrounding code |
| explain how something works, or which option to pick | `../prosci-investigate/SKILL.md` | write the question in one sentence |
| change documentation only | `../prosci-docs/SKILL.md` | search for the claim, do not browse |
| a behaviour change that also alters a command, a flag, or a default | the behaviour route first, then `../prosci-docs/SKILL.md` | finish the route, then search for the claims it invalidated |
| ship a version, package, tag, or published artifact | `../prosci-release/SKILL.md` | preflight, then prove the artifact |
| start a repo, or adopt one with no usable conventions | `../prosci-init/SKILL.md` | inspect before you create |
| the scope is unclear, or the change is large | `../prosci-ship/SKILL.md` | settle the scope in step 2 before writing code |

Every route ends at `../prosci-bar/SKILL.md`. Read the bar once per session. Read the route
before the first edit, not after.

Two routes stack. When a behaviour change invalidates a documented command, a flag, or a
default, run the behaviour route to a merged pull request and then the docs route. The docs route
alone is for documentation that is wrong with no code change behind it. Running it first means the
docs describe a change that does not exist yet.

A question is not a change. If the user asked why something behaves a certain way, or which
approach to take, route to investigate and change nothing. The most common misroute in this
factory is turning a question into a patch.

Use a route even when the change looks small. A one-line fix still needs the failing case, the
output, and a pull request. What changes with size is the amount of planning, never the evidence.

## Parallel work

Two units can run at once when they touch disjoint files and share no running process. Say which
units are parallel before starting them, and give each worker a self-contained brief.

These must run in order: two edits to the same file, a change and its test when the test imports
the change, a migration and the code that reads the migrated table, anything sharing a lock, a
port, a branch, or a scratch directory.

## When you are stuck

Say which step you are on, what you tried, and what you observed. A blocked report that names the
step is useful. A silent guess is not.

Stop and ask only when the choice is irreversible or the fork changes the product, such as a
public API shape, a data deletion, a pricing decision. For any reversible choice, pick the
option you can undo, do it, and say what you chose and why.

## First message

Restate the goal in one line, name the route, and name the smallest change that meets it. Then
start.

## Reply

The goal, the route taken, what changed, the commands you ran with their result, the pull request
link, and anything the route skipped with the reason.
