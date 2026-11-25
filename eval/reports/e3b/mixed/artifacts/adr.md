# ADR 0001: Implementation shape for `median`

Status: accepted (architect unit u1-architect)

## Context

`median` lives in `src/stats.mjs` and is consumed by `test/stats.test.mjs`, which pins two behaviours:
an odd count returns the middle value, and an even count returns the mean of the middle two. The
package is private, has no runtime dependencies, and declares exactly one script: `npm test` → `node --test`.

The question this ADR settles is the *shape* of the implementation, not its behaviour: how the
function reaches the middle value, and what the function's error and edge contract is. The public
signature `median(values) -> number` is fixed by the existing tests and is not up for decision here.

## Forces

| Force | Source | Effect on the shape |
| --- | --- | --- |
| Signature is fixed as `median(values) -> number` | `test/stats.test.mjs` imports `median` and asserts on plain numbers | Both options must keep one exported function with this exact signature; no new parameters, no options bag. |
| Only consumer is the test suite; no runtime dependencies | `package.json` (`private: true`, no `dependencies`) | A hand-rolled selection algorithm buys nothing here — no external caller is being slowed down. |
| JS `Array.prototype.sort` defaults to lexicographic order | ECMAScript `sort` semantics | Numeric ordering needs an explicit `(a, b) => a - b` comparator. This is the single most likely silent defect in this function. |
| Input size is not stated anywhere in the repo | No benchmark, fixture, or size note in `src/`, `test/`, or `tools/` | Complexity choice cannot be justified by a measured requirement today. |
| `tools/check-review.mjs` requires a review to cite a real implementation line and to not be a copy of this ADR | Tool source | This artifact must state the shape in words and types, not by quoting implementation lines. |

## Options

**A. Copy, sort, index.** Non-mutating copy, numeric sort, index into the middle.

```js
// src/stats.mjs
export function median(values) -> number
// contract: returns the middle value for odd length,
// the mean of the two middle values for even length,
// NaN for an empty array. Does not mutate `values`.
```

**B. Selection (quickselect).** Partition-based k-th element selection, no full sort.

```js
// src/stats.mjs
export function median(values) -> number
// contract: identical observable behaviour to A.
// needs two selections for even length, plus explicit
// duplicate handling; still copies to avoid mutating `values`.
```

Both options are pure, keep the same export and signature, and are observationally identical for the
behaviours the tests pin. They differ in internal complexity (O(n log n) vs. average O(n)), in code
volume, and in how many edge behaviours need their own tests.

## Decision

We will implement `median` as a non-mutating copy, numeric sort, and index into the middle, so that the
function's correctness is checkable by reading rather than by trusting a hand-rolled selection algorithm.

Tie-breaker, applied because the two options tie on every force above: **the cheaper one to delete wins**
— A is roughly a third of the code and the whole of B can be deleted and replaced inside one function
body, with no caller and no test rewritten.

Behaviour contract that goes with this decision:

- Numeric comparator is mandatory: `values` are numbers, not strings.
- The caller's array is never mutated (the copy is the default for a pure helper).
- Empty input returns `NaN`. This is a choice made here because neither the tests nor the repo pin it;
  it is documented so a later reader does not have to guess.
- `NaN` and non-numeric entries are not handled specially; they follow the comparator's result.

**What would reopen this:** a measured input size or a stated latency requirement in this repo, or a
second consumer outside the test suite. Any such claim must arrive with a benchmark, not an assertion.

## Consequences

**Reversal cost: low, and it stays low.** The function is pure, its export name and signature are
already fixed by the tests, and the only observable surface is the returned number. Switching to
quickselect later means replacing one function body; no caller changes, no test changes, no data
migration. Undoing stops being cheap only if a second consumer is added that depends on the *internal*
choice rather than the output — nothing in this repo does.

What the decision buys: one obvious place for the numeric-ordering defect to live, and a code path a
reviewer can verify in one reading.

What it costs: O(n log n) instead of average O(n), and the empty-array case is fixed at `NaN` rather
than remaining open.

**Verification command** (proves the decision is implemented, not just described):

```
npm test
```

It runs `node --test` over `test/stats.test.mjs`, which asserts the odd-count middle value, the
even-count mean of the two middle values, and — under this ADR — the empty-input `NaN` case once that
test is added.
