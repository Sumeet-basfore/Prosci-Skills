# Outstanding conditions for public alpha

State as of the preview freeze. Each condition is either met, or names what would meet it. Nothing here
depends on more evaluation runs; all of it depends on real use.

## Met

| condition | evidence |
| --- | --- |
| Seventeen skills exist with enforced boundaries | `skills/`, 44 L1 scenarios including 14 boundary pairs |
| Install, re-install, check and remove verified | `eval/harness/install.mjs` 5/5; clean-target run in `eval/reports/phase-4.md` §4 |
| Supported harnesses documented with what is tested and what is not | `docs/supported-harnesses.md` |
| Zero product telemetry, verified mechanically | `docs/network-inventory.md`, `eval/harness/audit-network.mjs` in CI |
| Limitations published, including negative results | `docs/alpha.md`, `eval/reports/phase-0.1.md` … `phase-4.md` |
| Historical results and the baseline tag preserved | `v0.1-eval-baseline` unmoved; reports unedited |

## Not met — these gate public alpha

1. **A human-reviewed, merged result from a real task.** None exists. Every real-task result so far is
   machine-scored. Needs: one record in `docs/preview/records/` with `outcome: merged` and a named
   reviewer.
2. **Install confirmed by someone other than the author.** The installer is tested; a second person has
   not run it. Needs: one `third-party install` record.
3. **Merge escalation resolved or accepted in writing.** Three corrective runs, unchanged behaviour. The
   preview requires explicit human approval for an unresolved semantic conflict; public alpha needs either
   a fix with a regression scenario, or a written decision that the limitation ships.
4. **Assertion class decision.** Reply assertions have been word-bound three times. Needs: a rule that new
   reply assertions must use the paraphrase lint, and any remaining one converted to an artifact check or
   flagged for human review.
5. **Usefulness evidence.** No claim that Prosci improves productivity or quality is supported. Needs:
   records where humans say whether it helped, including "no".

## Explicitly not required

- More synthetic benchmarks. Two comparisons on synthetic tasks produced no difference; a third would not
  change the decision.
- More skills. The three deferred skills (`prosci-security`, `prosci-perf`, `prosci-incident`) stay
  deferred until a real task demonstrates the gap.
- A public release tag or package. No release is published without final approval.

## Decision rule

Public alpha when conditions 1–3 are met and 4–5 have a written position. If condition 1 has not happened
after the preview, the outcome is "keep as private preview", not "release and see".
