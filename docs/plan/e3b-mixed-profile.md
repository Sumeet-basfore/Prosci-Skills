# E3b — economy vs role-specific mixed profile (proposed, not executed)

Two arms of the same plan, differing only in model assignment. Nothing here runs until separately
approved. E3a must be accepted first, including its recorded isolation caveat.

## Plan under test

Same fixture and units in both arms, so the only variable is the model attached to each role.

| Unit | Role | Depends on | Owned files | Controller acceptance |
|---|---|---|---|---|
| `u1-architect` | architect | — | `docs/plan/adr.md` | file exists; names one chosen option and one rejected option with a reason |
| `u2-implement` | implementer | u1 | `src/<feature>.mjs`, `test/<feature>.test.mjs` | `node --test` passes; new test fails on the untouched fixture |
| `u3-review` | reviewer | u1, u2 | `docs/review.md` | file exists; cites `src/` line references; verdict is `pass` or `block` |

`u3` cannot pass by copying `u2`: it must cite lines that only exist after `u2`, and the acceptance
for `u3` checks the citation against the integrated file. The fixture is a small repo where the
test is expected to fail before `u2` — proven before the run, as in E2.

## Arms

| Unit | Economy | Mixed |
|---|---|---|
| u1-architect | `claude-haiku-5-5` | `minimax-m3` |
| u2-implement | `claude-haiku-5-5` | `claude-haiku-5-5` |
| u3-review | `claude-haiku-5-5` | `minimax-m3` |

Why this shape: implementation is where cheap-and-fast is usually adequate, while architecture and
review are the roles where a stronger model is most often claimed to pay for itself. E3b tests
whether that claim survives cost accounting — not whether MiniMax is "better", which E3a did not
establish and two runs cannot.

## Cost, from measured token counts

Per-unit token counts come from E2 (≈4k tokens/unit on haiku) and E3a probes (1.7–2.3k for a trivial
task; real units are larger). Catalogue rates, cache tokens included.

| Arm | Estimate | With 50% margin |
|---|---|---|
| Economy (3 × haiku) | ~$0.0007 | ~$0.0011 |
| Mixed (2 × minimax + 1 × haiku) | ~$0.0040 | ~$0.0060 |

Total for both arms ≈ $0.007. **Ceiling per arm: $0.02**, enforced as a stop, with the request cap as
the only hard gate. If a provider reports a materially different invoice later, the estimate is
wrong and will be reported as such.

## Enforceable limits

- 2 executions total (one per arm), each bound to its own plan hash and sidecar authorization.
- **24 requests per arm**, pre-created budget file, atomic reservation in the proxy; `429` when spent.
- Allowlist exactly `claude-haiku-5-5,minimax-m3`; any other model gets `403` before reserving.
- 1 retry per unit, clamped to authorization; concurrency 2; 20-minute run and 10-minute unit
  deadlines; cancellation kills process groups.
- No provider switch, no fallback model, no second attempt after an identity mismatch.

## Acceptance and stopping rules

Controller-owned checks run in the integrated tree, not the worker's report. Stop the arm and report
on: reported model ≠ assigned model, changed files outside ownership, acceptance failure after
retries, request budget exhausted, deadline, surviving processes after cancellation, or a diff that
passes only because a test was weakened.

The review unit is judged by citation, not by agreement: a `block` verdict with a correct citation
is a pass for the experiment. This keeps "did the review unit do its job" separate from "was the
feature good".

## Approval boundaries

Approval is per arm, by plan hash, single-use. A human approves before execution; nothing merges from
this experiment. If a unit needs a semantic conflict resolution, execution stops and a human decides
— the same rule as Phase 3.

## What the result will and will not mean

It will show, at n=1 per arm on one small plan, whether the mixed assignment completed with the same
acceptance, and what it cost in tokens and requests. It will not show a quality difference between
models, and no model will be ranked on this evidence. If the mixed arm costs 3–6× for the same
acceptance, that is a budget fact, not a verdict on architecture quality.
