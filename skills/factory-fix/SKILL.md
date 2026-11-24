---
name: factory-fix
description: "Fix a bug the factory way: reproduce it, prove the cause, write the failing test first, fix, and verify on the same surface. Use when something is broken, a test fails, or the user reports wrong behaviour."
---

# Fix a bug

A bug is fixed when the same surface that failed now passes, with evidence. Everything before
that is a hypothesis.

## 1. Reproduce before you read the fix

Run the failing thing yourself and paste the output. If it will not reproduce, tighten the
conditions until it does: the exact input, the sequence, the environment, the data. A bug you
cannot reproduce is a bug you cannot verify, and a fix without verification is a guess.

## 2. Find the first wrong thing, not the loudest one

Trace from the symptom back to the first place the system stopped doing what it promised. That
is the cause. A guard added at the loud end of the stack hides the bug and doubles the code.

If two fixes in a row share the same assumption and both failed, stop and test the assumption
directly. The bug is upstream of where you keep editing.

## 3. Write the failing test first

Cheap local target, take it. The test fails before the fix and passes after, and it asserts what
a user observes rather than an internal helper. Commit the failing test before the fix when the
sequence is useful to a reviewer.

No cheap target, say why and name the substitute: a reproduction script, a curl, a snapshot, a
log assertion. The substitute is what you paste.

## 4. Fix the cause

Smallest edit at the cause. If the fix needs a refactor, do the refactor first as its own green
commit, then the fix on top.

## 5. Verify on the same surface

The original reproduction now passes. Run the repo's full commands and paste the output. Then
check the neighbours: the same code path with a different input, and the caller that hit it.

## 6. Explain it

In the pull request, one paragraph: what was broken, why, how it now fails differently. If the
bug could recur, say what would catch it next time.

## Reply

What was broken, the cause, the failing-then-passing output, the pull request, and what remains
unverified.
