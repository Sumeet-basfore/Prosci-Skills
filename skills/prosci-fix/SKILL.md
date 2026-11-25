---
name: prosci-fix
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

## Diagnosis procedure

The order matters: each step removes a class of guesses.

1. **Reproduce.** One command or one click, from a clean state. Record the exact input and the exact wrong
   output. No reproduction, no fix.
2. **Minimise.** Remove inputs and code until the failure is one case. A minimal reproduction usually names the
   cause.
3. **Instrument, do not guess.** Add a log or a probe at the boundary where the value is wrong, and read it.
   "Probably a race" is a hypothesis, not a finding.
4. **Bisect when the cause is temporal.** `git bisect run <test>` over commits; binary-search over inputs or
   configuration when it is data.
5. **State the cause as a falsifiable sentence.** "The total is NaN because `reduce` has no initial value and
   the file is empty." Then predict what the fix changes, and check that prediction.
6. **Fix the cause once, in the shared code.** Grep every caller of the function you touch before editing it.
7. **Add the regression test at the level the bug appeared.** CLI bug → CLI test; library bug → unit test.
8. **Verify the test can fail**: revert the fix, watch it go red, re-apply.

### Symptom versus cause

| symptom | plausible cause | how to tell |
| --- | --- | --- |
| works locally, fails in CI | environment, timezone, locale, missing seed | run the failing command with `TZ`, `LANG`, empty env |
| fails intermittently | race, shared state, retry without idempotency | run N times, add a delay, look at interleaving |
| fails after a while | leak, unbounded growth, cache expiry | watch memory and row counts over time |
| fails only for some users | authz, tenancy, data-dependent branch | find the differing field, reproduce with it |
| fails only on deploy | migration order, config drift, stale cache | compare schema and config, not code |

### Worked example

Bug: "the report command prints nothing for some files."

Poor: wrap the read in `try/catch` and print 0. The empty file still silently lies, and the real defect — a
missing initial value — stays.

Effective: reproduce with an empty file (`bin/report --total empty.txt` → `TypeError`), minimise to
`[].reduce(fn)` → throw, state the cause, fix with an initial value, add the empty-file case to the suite and
confirm it fails without the fix.

### Anti-patterns

- **Shotgun fix.** Three changes at once; the next failure cannot be attributed.
- **Fixing the test.** If the test encodes the requirement, the code is wrong, not the test.
- **Catch-all handling.** Swallowing an error converts a crash into silent corruption.
- **Fixing only the reported path.** Grep the callers: the same defect usually exists twice.

## Before you report

Run the steps in `../prosci-bar/SKILL.md`. The regression box is the one that matters most here.

## Reply

What was broken, the cause, the failing-then-passing output, the pull request, and what remains
unverified.
