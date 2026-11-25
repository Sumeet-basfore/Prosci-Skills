# ADR 0001: the shape of the `median` contract

- Status: Accepted
- Date: 2026-11-25
- Scope: `src/stats.mjs` — the public `median` function only.

## Context

`src/stats.mjs` exports one function, `median(values)`, currently a stub that throws. The tests
in `test/stats.test.mjs` already pin the two core cases: an odd count returns the middle value, an
even count returns the mean of the middle two. What is *not* pinned is everything else the function
has to decide, and those decisions are the ones a consumer can observe:

- what `median` returns for an empty input,
- whether it sorts its argument in place (the caller can observe this: the caller's array comes
  back reordered),
- what it does with input that is not a sorted numeric sequence,
- whether it mutates, copies, or reads.

These are the classic median ambiguities, and they are exactly the ones where two defensible
implementations produce different observable results. The cost of changing this contract after
callers exist scales with the number of callers, so the shape should be chosen before the code is
written.

Scope note: this ADR covers the contract of `median` only. It deliberately does **not** settle the
general question of "how should statistics functions in this package be shaped" — that would be a
second decision, and the brief for this unit is one decision.

## Forces

| Force | Source |
| --- | --- |
| The package is ESM, `"type": "module"`, plain `.mjs`, no dependencies, `"private": true` | `package.json` |
| The published surface is one exported function; `median` is called as `median([3, 1, 2])` | `test/stats.test.mjs` |
| The function is expected to be pure and side-effect free; `assert.equal(median([3, 1, 2]), 2)` compares against a value, not a mutated array | `test/stats.test.mjs` |
| No caller outside this repo exists yet, so the contract is cheap to change **now** and expensive later | repo has one call site, the test file |
| Node's own `Array.prototype.sort` mutates in place and is the default comparator for arrays of numbers is not guaranteed to be numeric | ECMAScript `sort` semantics |

## Options

### Option A — copy, sort numerically, return the middle; empty input is a caller error

```js
// src/stats.mjs
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("median: expected a non-empty array of numbers");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
```

- Boundary: the module exports the contract; the function owns validation.
- Dependencies: none, inward only. `median` calls no project code.
- Data flow: input array → defensive copy → numeric sort → index → number out.
- Failure mode: throws `TypeError` on a non-array or an empty array; throws `RangeError` from the
  comparator if an element is not a number.
- Migration cost: trivial today (one call site), grows linearly with callers.

### Option B — the caller pre-sorts; `median` reads a sorted sequence and validates it

```js
// src/stats.mjs
export function median(sortedValues) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    throw new TypeError("median: expected a non-empty sorted array of numbers");
  }
  for (let i = 1; i < sortedValues.length; i += 1) {
    if (!(sortedValues[i - 1] <= sortedValues[i])) {
      throw new TypeError("median: input must be sorted ascending");
    }
  }
  const mid = sortedValues.length >> 1;
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
}
```

- Boundary: the caller owns ordering; the function is a pure reader over an already-sorted array.
- Dependencies: none, inward only.
- Data flow: pre-sorted array → monotonicity check → index → number out.
- Failure mode: throws `TypeError` on a non-array, an empty array, or an unsorted array.
- Migration cost: every call site must sort first — one call site today, but the burden lands on
  the caller, not the function.

## Decision

**We will implement `median` as Option A — a total function that copies, sorts numerically and
returns the middle value, throwing `TypeError` on empty or non-array input — so that callers can
pass an unsorted array and get a correct number without pre-sorting.**

## Consequences

- The caller never has to sort. The only current call site, `median([3, 1, 2])`, stays as written.
- `median` does not mutate its argument. Sorting a copy is what makes that true; `Array.prototype.sort`
  mutates in place, so the copy is load-bearing, not decoration.
- Sorting is numeric (`a - b`), not lexicographic. `median([10, 9])` is `9.5`, not `9.5` only by
  luck — lexicographic sort would give `9.5` for `[10, 9]` but `["10","9"]`-style inputs would
  compare as strings, so the comparator is specified explicitly.
- An empty input is a caller error, signalled by a thrown `TypeError`, not by `null`, `NaN`, or
  `Infinity`. A returned sentinel would have to be checked by every caller; a throw is caught once,
  at the boundary, and cannot be silently propagated into an arithmetic expression.
- `median` remains a pure function with no I/O, no clock, no ambient state, and no dependency on
  anything outside `src/stats.mjs`.
- **Reversal cost: low.** Undoing means changing one function body and updating the tests; there is
  no data migration, no persisted state, and no published event. Reversal stops being cheap once
  external callers depend on the throw-on-empty behaviour, or once `median` is re-exported from the
  package entry point — at that point the empty-input policy becomes a published contract and
  changing it is a version bump.
- **What would reopen this:** if a second statistics function lands that needs the same
  order-statistic machinery, or if a caller profile shows the input is always pre-sorted and the
  copy+sort shows up in a profile, Option B's "caller sorts" contract becomes worth its cost. If
  the package ever needs to accept a non-array iterable (a `Set`, a generator), that is a new
  decision, not a reversal of this one.

## Verification

The decision is checked by the existing test file plus one added edge case:

```bash
npm test
```

`test/stats.test.mjs` must pass unchanged (it pins the odd and even cases), and the added case must
assert that `median([])` throws and that `median` leaves its argument unmutated.

## The other options, and why they lost

Option B was rejected because it moves work to the caller for no benefit here: there is exactly one
call site and it passes an unsorted array. The loser is recorded deliberately — the next person to
ask "why does `median` sort?" should find the answer here rather than re-deriving it.
