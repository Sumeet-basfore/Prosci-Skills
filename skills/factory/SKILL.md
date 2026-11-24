---
name: factory
description: "Route any code change through the factory workflow: pick a route, follow it, and land it with evidence. Use for any request to build, fix, refactor, or review code, or when the user says 'factory', 'use the factory', or 'ship this properly'."
---

# Factory

One entry point for every code change. Pick a route, follow it, land it with evidence a reviewer
can check.

## Non-negotiables

1. **Evidence, not claims.** A test suite is green when you pasted the command and its output.
   "Should pass" and "compiles" are not results.
2. **The smallest change that solves it.** No new dependency, abstraction, config, or option
   nobody asked for. Delete before you add.
3. **One change per pull request.** A fix that also refactors is two pull requests.
4. **Never weaken a check to pass.** No lowered threshold, no commented assertion, no skipped
   test, no `|| true`. If the check is wrong, say so and fix the check in its own change.
5. **Read before writing.** The repo's own instructions first, then the file, then the diff.

## Route

| the request | route |
| --- | --- |
| build a feature or behaviour | `../factory-ship/SKILL.md` |
| fix a bug or a failing test | `../factory-fix/SKILL.md` |
| review a diff or a pull request | `../factory-review/SKILL.md` |
| the scope is unclear | `../factory-ship/SKILL.md`, and settle the scope in step 2 before writing code |

Read the route file before the first edit, not after. Every route ends at `../factory-bar/SKILL.md`,
the definition of done.

## Parallel work

Two independent units, such as two unrelated files or two services, can go to two workers at
once with a self-contained brief each. Anything sharing a file, a branch, or a running process
runs in order. Say which units are parallel before starting them.

## First message

Restate the goal in one line, name the route, and name the smallest change that meets it. Then
proceed.

## Reply

What changed, the commands you ran with their result, the pull request, and anything the route
skipped and why.
