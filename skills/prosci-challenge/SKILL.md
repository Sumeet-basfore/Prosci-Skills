---
name: prosci-challenge
description: "Attack a proposal before it becomes code: unsupported assumptions, contradictions with the repo, failure modes, missing constraints and simpler alternatives, with blocking defects separated from optional improvements. Use when asked to stress-test a plan, design, requirement or decision."
---

# Challenge

The failure this route prevents: a proposal that everyone nods at, because nobody looked for the
sentence it contradicts. Challenge is adversarial about *ideas*, not about people, and it is useful only
if it separates "this will not work" from "I would have written it differently".

## When this runs

- A plan, design, requirement, ADR, migration, or estimate exists and has not been executed.
- The user asks what could go wrong, whether an approach holds, or to be talked out of a decision.
- Before an irreversible step: a schema change, a public API, a deletion, a spend.

## When it does not

- **Code already exists and needs review.** That is `prosci-review`: it reads the diff. This route reads
  a proposal.
- **Answering how something works.** `prosci-investigate`.
- **Choosing between designs.** `prosci-architect` produces the options; challenge can test them, but
  selecting one is not challenge's job.
- **A change with no proposal because it is one obvious step.** Do not manufacture ceremony; say the
  change is small enough that nothing here applies.

## Inputs

- The proposal text. Without it, ask for it; do not invent one to attack.
- The constraints it must satisfy: the repo's instructions, the product requirement, the budget, the
  deadline.
- The evidence base: call sites, existing tests, measured numbers. A challenge without evidence is an
  opinion with a stern voice.

## Procedure

1. **Restate the proposal in one sentence and get it right.** If you cannot, the proposal is ambiguous —
   that is the first blocking defect, and it is worth more than ten stylistic notes.

2. **List its load-bearing claims.** For each, write what would have to be true for it to work, and how
   you could check. A claim nobody can check is an assumption; label it.

3. **Test each claim against the repo, not against your taste.** Grep the call sites, run the command,
   read the test. Cite the file and line, or the command and its output. An objection without evidence
   is exactly what this skill is supposed to prevent.

4. **Walk the failure modes.** What happens on the empty case, the duplicate, the concurrent write, the
   retry, the rollback? Each one you can name with a concrete input is worth more than a paragraph of
   risk language.

5. **Propose the simpler alternative, once.** If a smaller design exists, name it in one paragraph with
   what it gives up. If it does not, say so; "no simpler path found" is a legitimate finding.

6. **Separate blocking from optional.** Blocking: the proposal contradicts a constraint, cannot work as
   described, or has an unowned failure mode. Optional: naming, order, style, an improvement for later.
   A report of ten optional notes and no blocking defect is a failed challenge, not a thorough one.

7. **State what would change your mind.** One line per blocking defect: the evidence that would make it
   not a defect.

## Claim extraction and falsification

### Turn prose into claims

Read the proposal and write one row per load-bearing claim:

| claim | what must be true | falsifier |
| --- | --- | --- |
| "the import is idempotent" | re-running produces no duplicates | run it twice, count rows |
| "writes are append-only" | no truncation or rewrite path | grep for `writeFile`, `truncate`, flags |
| "the existing tests cover it" | a test exercises this path | search the suite for the path, run it |
| "it fits in half a day" | the unknown schema is already known | list what is unknown |

A claim with no falsifier is an assumption; label it and say what would settle it.

### Failure modes worth walking through, every time

Empty input · duplicate submit · concurrent write · partial failure · retry after timeout · rollback · operator
error · data that grew 10× · the dependency being down · the feature being switched off mid-flight.

Each one you can state with a concrete input is worth more than a paragraph of risk language.

### Severity ladder

- **Blocking:** contradicts a stated constraint, cannot work as described, or has an unowned failure mode.
- **Should fix:** works, but creates a maintenance or operational cost that will be paid soon.
- **Optional:** naming, order, style, later improvement.

Ten optional notes and no blocking defect is a failed challenge, not a thorough one.

### Fallacies to refuse

- **Appeal to scale.** "It will be fine at our size" without a number and a margin.
- **Sunk cost.** "We already built half of it" — the question is what the remaining half costs.
- **Survivorship.** "Company X does it this way" without their constraints.
- **Unfalsifiable safety.** "It is idempotent in practice" — run it twice.

### Worked example

Proposal: truncate `data/records.json`, stream the vendor CSV into it, re-run on failure.

Blocking defect 1: the repo rule says all writes go through `src/store.mjs`, which keeps a backup and journal.
Blocking defect 2: truncating first destroys the only copy, and "re-run on failure" cannot restore it.
Blocking defect 3: the proposal claims existing tests cover the import; there are none for it.

Recommendation: revise. The fix is to import into a staging file through the store, verify the row count, then
swap. Each of those is checkable, which is what makes it a proposal and not a wish.

## Output

- The proposal in one sentence.
- Blocking defects: claim, evidence, consequence, what would disprove it.
- Optional improvements, clearly subordinate.
- The simpler alternative, or a statement that none was found.
- A recommendation: proceed, revise, or stop — with the reason.

## Failure handling

- **The proposal is not written down.** Say so and ask for it. Do not review a paraphrase and call it a
  review.
- **A claim cannot be checked with what is available.** Report it as an untested assumption, with the
  check that would settle it; do not upgrade it to a defect.
- **You cannot find a defect.** Say that, and say what you tested. An honest "this holds under the
  checks I ran" is a finding; inventing an objection to look critical is worse than useless.
- **The proposal is already code.** Stop and route to `prosci-review`; attacking a merged change is
  archaeology unless someone is deciding to revert it.

## Acceptance criteria

1. The proposal is restated in one sentence that its author would accept.
2. Every blocking defect cites a file, a command, or a measurement; none is "this feels risky".
3. At least one failure mode names a concrete input and the wrong outcome it produces.
4. Blocking and optional findings are separated, and the blocking list is short enough to act on.
5. Either a simpler alternative is named with its trade-off, or the report says none was found.
6. The recommendation names proceed, revise or stop, and the reason.
