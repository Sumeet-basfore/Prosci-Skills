# ADR 0001: Implementation shape for `median`

Status: proposed (architect unit u1-architect)

## Context

`median(values)` in `src/stats.mjs` is a stub that throws. `test/stats.test.mjs` pins two behaviours: an odd count returns the middle value, and an even count returns the mean of the middle two. The package is small and private, with no runtime dependencies, and the only consumer is its own test suite.

Forces:
- The public signature `median(values) -> number` is fixed by the tests.
- JavaScript `Array.prototype.sort` with no comparator sorts lexicographically, so numeric input needs an explicit `(a, b) => a - b` comparator.
- The tests do not constrain whether the input array may be mutated, or what an empty array returns. Both must be decided, not left implicit.
- Input sizes are not stated anywhere in the repo.

## Options

**A. Copy, sort, index.** Copy the input with `[...values]`, sort numerically, and take the middle element or the mean of the two middle elements. Time is O(n log n), and the code is about six lines.

**B. Quickselect.** Use selection (for example, Hoare-style partitioning) to find the k-th element in average O(n) time. It still needs a copy to avoid mutating the caller's array. It needs more code, careful handling of duplicates and even counts (two selections), and more tests to pin its edge behaviour.

## Decision

Choose **A: copy, sort, index**.

Reasons:
- The code is simple enough to verify by reading, and the existing two tests cover it directly.
- O(n log n) is adequate for a stats helper with no stated performance requirement. Option B's gain only matters at input sizes this repo does not mention.
- Copying first means the caller's array is never mutated, which is the safer default for a pure function.

Behaviour to implement under this decision:
- Sort with a numeric comparator.
- Return `NaN` for an empty array. This is a proposed default, not something the existing tests require, and it should be confirmed before the implementation lands.

## Consequences

Reversal cost is **low**. The function is pure, its signature is fixed, and the tests pin only observable outputs. Moving to quickselect later means replacing the body of `median` and keeping the same two tests passing, with no caller changes. Any performance argument for B should come with a measured input size.

Open items:
- Confirm the empty-input behaviour (proposed: `NaN`).
- Confirm whether `NaN` or non-numeric entries need handling. Neither is covered yet.
