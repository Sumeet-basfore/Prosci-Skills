# L-001 evaluation — injected versus discovered skills

Status: proposal only. No paid execution is authorized. This would be the first experiment that isolates
the delivery mechanism from the model.

## Question

Does delivering an assigned skill's body inside the worker instructions improve workflow adherence and
artifact quality over registering the skill for discovery, and what does that cost in context?

## Design

Two arms, same plan, fixture, model, skill bodies and acceptance:

| Arm | Delivery |
|---|---|
| discovered | `--skill <path>` only, as before the correction |
| injected | the same plan, with `skillsFingerprint`, bodies prepended by `prosci-swarm-run` |

Three scenarios that have a procedure a worker can skip without failing the plain acceptance check:

1. `ord-fix` — a failing test whose skill prescribes reproduce-before-edit. Score whether the diff is preceded by a failing-test run in the output.
2. `ord-arch` — an ADR task requiring two named options and a reversal cost. Score the artifact against those four fields.
3. `ord-review` — a review task whose skill requires citing a real line and separating blocking from non-blocking. Score citation validity and classification.

Model: `anthropic/claude-haiku-5-5` at low thinking, both arms. Reps: 2 per scenario per arm (12 runs).
Fresh repository and proxy per run, bound base + fixture + skill fingerprint, 24 requests, 1 retry,
concurrency 2, 20/10-minute deadlines. Proposal: $0.03 ceiling enforced by `--max-cost` at the runner,
request cap enforced at the proxy.

## Measures

- **Adherence** (primary): per-scenario checklist, scored from the raw JSONL and the artifact, not from the
  worker's claim. Examples: a failing test was run before the first edit; both options are named; the review
  cites a line that exists.
- **Independent correctness**: the existing acceptance command, plus one hidden acceptance the worker is not
  shown, run by the harness after the worker exits.
- **Token overhead**: instruction bytes, estimated instruction tokens, total tokens and estimated cost per
  unit; report the injected arm's extra input tokens as a ratio, not just an absolute.
- **Artifact quality**: four 0–2 dimensions scored blind by a second reader (or deterministic checks where
  possible): scope discipline, evidence, edge cases, clarity. No aggregate "quality score" is inferred from
  one task.

## Decision rule

Injection is worth keeping if, at equal or better independent correctness, it raises adherence on at least two
of three scenarios and the instruction overhead stays below 15% of the model's available context. A tie is a
valid result: it would mean discovery is adequate and injection should stay optional. A regression on
correctness stops the comparison and is reported as a failure of this delivery, not of the model.

## Guardrails

- Negative and neutral results are preserved; no rerun to obtain a nicer split.
- No skill body edits, no model changes, no request-cap increase.
- The discovered arm must not accidentally receive the bodies; the harness asserts the instruction file lacks
  the assigned skill's first non-heading line.
- Raw JSONL, access log, budget, identity and instruction bundles are preserved per run.
