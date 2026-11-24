---
name: factory-fix
description: "Fix a bug the factory way: reproduce it, find the first wrong thing, write the failing test first, fix the cause, and verify on the same surface. Use when something is broken, a test fails, or the user reports wrong behaviour."
---

# Fix a bug

A bug is fixed when the surface that failed now passes, with evidence. Everything before that is
a hypothesis.

## 1. Reproduce before you read the fix

Run the failing thing yourself. Paste the command and the output.

- From a bug report: use the exact input, the exact sequence, the exact environment.
- From a test failure: run that one test, not the suite, so the signal is clean.
- Cannot reproduce: tighten conditions until you can. The same data, the same timezone, the same
  cached state, the feature flag on. A bug you cannot reproduce is a bug you cannot verify.

If the reproduction needs a real person or a real third party, say so and name the closest
substitute you will use instead.

## 2. Find the first wrong thing, not the loudest

Trace from the symptom back to the first place the system stopped doing what it promised.

Start where the two tables below point, and grep the callers before you edit anything.

| symptom | look first at |
| --- | --- |
| wrong value, right shape | the transformation or the default, not the renderer |
| works once, fails on repeat | state that survives a call, a cache, an idempotency key |
| fails under load only | a shared resource, a lock, a connection pool, a retry storm |
| fails on some machines | config, environment, locale, timezone, path, dependency version |
| fails after the second request | auth, session, cookie scope, token refresh |
| silent no-op | a swallowed error, an early return, a guard that never fires |
| nondeterministic | ordering, concurrency, an unawaited promise, a race |

Two fixes in a row that share an assumption, both failed: stop and test the assumption itself.
Write it down as a sentence and prove or disprove it. The bug is upstream of where you keep
editing.

A guard added at the loud end of the stack is not a fix. It hides the bug and doubles the code.
Guard only the state that is legitimately possible at a boundary.

## 3. Write the failing test first

Cheap local target, take it. The test:

- fails before the fix, with the failure you predicted, not an unrelated error,
- passes after the fix,
- asserts what a user observes, not an internal helper,
- would fail again if someone reintroduced the bug.

Commit the failing test before the fix when the sequence helps a reviewer. `test(scope): prove
X fails when Y` then `fix(scope): ...`.

No cheap target, name the substitute and paste its output: a reproduction script, a `curl`, a
snapshot comparison, a log assertion, a driven UI step. The substitute is evidence. An
explanation is not.

## 4. Fix the cause

Smallest edit at the cause. If the cause needs a refactor to be fixable, do the refactor first as
its own green commit, then the fix on top. Two commits, two reasons.

Keep the existing error handling and validation when you move code. A moved check that lost its
condition is a new bug.

## 5. Verify on the same surface

1. The original reproduction now passes. Paste it.
2. The full suite passes. Paste it.
3. The neighbours: the same path with a different input, and the caller that hit it.

A passing test elsewhere is not a verification of this bug.

## 6. Explain it

One paragraph in the pull request: what was broken, why, how it now fails differently. If the bug
could recur, say what catches it next time. If the same class of bug exists elsewhere, name the
places and open separate work for them rather than fixing them here.

## Before you report

Run the steps in `../factory-bar/SKILL.md`. The regression box is the one that matters most here.

## Reply

What was broken, the cause, the failing-then-passing output, the pull request, and what remains
unverified.
