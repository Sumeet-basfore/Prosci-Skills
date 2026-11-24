---
name: factory-bar
description: "The definition of done every factory route ends at, and the evidence rules that make it checkable. Read before you claim a change is finished."
---

# The bar

A change is done when a reviewer can check these six boxes without asking you a question.

## 1. It does the thing

The acceptance line from the spec is true, and you showed it. Observable behaviour, not internal
plumbing.

## 2. The checks ran, and you pasted them

The repo's real commands, their real output. A suite that passes for you but has never run on a
fresh checkout is not passing, it is untested in the place that matters. When a command depends
on a local environment, name that dependency or remove it.

## 3. A test would catch the regression

A test fails when this behaviour breaks and keeps passing when only the internals move. If no
test could fail, say why. "Not testable" is a claim a reviewer can dispute.

## 4. The diff is the smallest one that works

No new dependency, abstraction, config, or option nobody asked for. Unrelated rot left alone or
shipped separately. Deleting dead code counts as progress and belongs in its own change.

## 5. The change is explained

Why it exists, what it does, what it does not touch, and the verification. A reader who has never
seen the task should follow it in one pass.

## 6. Nothing was hidden

No weakened assertion, no skipped test, no silenced error, no flag flipped to make a check happy,
no claim you did not run. If something is unproven, it is written down as unproven.

## Failure modes to catch yourself in

- **Claiming a pass from a proxy.** "It compiles", "the types check", "should be fine".
- **Fixing the test instead of the bug.** Check which one was wrong before you edit either.
- **Bundling.** A fix plus a refactor plus a rename, so a reviewer cannot tell which line caused
  the regression.
- **Inventing scope.** Adding the option nobody asked for because the code made room for it.
- **Skipping the surface.** Suite green, page broken.
- **Reporting intent.** A pull request that describes what you meant rather than what landed.

## Reply

The six boxes, each true or explicitly unmet with the reason. Unmet boxes ship only with the
reviewer's agreement, in writing.
