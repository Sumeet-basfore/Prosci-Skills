# Review: `median` in src/stats.mjs

Verdict: **pass**

## Intent

The diff implements `median(values)` and nothing else. It matches the stated requirement: the odd-count and even-count cases.

## Evidence

- `node --test` run in this worktree: 2 tests, 2 pass, 0 fail.
- Spot checks run by hand: `median([3,1,2])` → 2, `median([4,1,3,2])` → 2.5, `median([10,9,2])` → 9. The sort is numeric, so `10` is not ordered before `9`.

## Correctness at the edges

- `src/stats.mjs:2` copies the input before sorting, so the caller's array is not mutated.
- `src/stats.mjs:2` uses a numeric comparator. Without it, `[10, 9, 2]` would sort lexicographically; the code avoids that.
- `src/stats.mjs:3-5` handles odd and even lengths. The two middle values are averaged for even counts.

## Findings

- `src/stats.mjs:5`  **non-blocking**  The empty-array result is `NaN`, but it comes from `undefined + undefined` on the even branch, not from an explicit check. Add `if (sorted.length === 0) return NaN;` so the behaviour is intentional and survives a refactor.
- `src/stats.mjs:2`  **non-blocking**  Non-numeric and `NaN` entries are not rejected. String entries are coerced by the subtraction comparator (`["10","9","2"]` → 9). Decide whether that is acceptable. If it is not, validate at the entry point.

## Not checked

- Performance on large inputs. No size requirement exists in the repo, so I did not measure it.
- Callers outside the test suite. None exist in this repo.
