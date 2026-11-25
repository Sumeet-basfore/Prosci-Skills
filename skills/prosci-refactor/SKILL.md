---
name: prosci-refactor
description: "Improve structure without changing behaviour: pin the current behaviour with evidence, name the target shape, move in small verified steps, and prove the public contract is intact. Use when the request is to simplify, extract, rename or reorganise code that already works."
---

# Refactor

The failure this route prevents: a "cleanup" that quietly changes behaviour. A refactor has exactly
one promise — the outside stays the same — and that promise is only worth something if something
checked it before and after.

## When this runs

- Simplify, extract, inline, rename, move, or de-duplicate code that already works.
- A module has grown two responsibilities and the boundary needs to move.
- Review asked for a structural change with no behaviour change.

## When it does not

- **The behaviour is wrong or missing.** That is `prosci-ship` (new behaviour) or `prosci-fix` (bug).
  Disguising a fix as a refactor is how an unreviewed behaviour change lands.
- **Reviewing someone's diff.** `prosci-review`.
- **Choosing a new shape for a boundary that does not exist yet.** `prosci-architect` first, then here.
- **Adding an abstraction for one caller, or "for later".** That is speculative; refuse it and say why.

## Inputs

- The behaviour that must not change, written down.
- The structural defect: duplication, a wrong boundary, a misleading name, a hidden dependency.
- The verification commands, verified by running them now.
- The public contract: exported names, CLI flags, file formats, HTTP shapes, events.

## Procedure

1. **Pin the behaviour before touching code.** Run the suite and record its output. If the area has no
   test that would catch a behaviour change, add one *first*, as its own commit — that is the
   characterization evidence, and it is the only thing that makes the later steps safe. If you cannot
   write that test, stop: you cannot refactor what you cannot observe.

2. **Name the structural defect in one sentence**, with a measurement: "the same money formatting is
   written three times in `receipt.mjs`, `invoice.mjs`, `refund.mjs`". A refactor without a named
   defect is taste, and taste is not reviewable.

3. **Name the target shape and the public contract.** What moves, what stays, what the exports are
   after. If an export disappears, it is a breaking change: that is `prosci-ship` with a deprecation,
   not a refactor.

4. **Move in steps that each keep the suite green.** One extraction per commit. Never a step that both
   moves code and changes it — if the body must change, change it in a separate commit first, so a
   failure points at one of the two.

5. **Re-run the same checks and compare.** Same command, same output expectations as step 1. Paste both
   results. A green suite after a red one proves nothing.

6. **Check the contract mechanically.** Import the public surface and assert the exported names are
   unchanged, or run the CLI's `--help`, or hit the endpoint. "Nothing uses it" is a claim to verify,
   not a reason to skip.

7. **Stop at the named defect.** Unrelated cleanup, a rename you noticed, a formatting pass: leave them.
   Report them as separate work instead.

## Output

- The named defect and the target shape.
- The characterization evidence from before, and the same checks after, both pasted.
- The contract check.
- The commits, each green.
- Anything deliberately not touched.

## Failure handling

- **The suite was red before you started.** Stop. A refactor on a red suite cannot distinguish your
  damage from the existing failure; route to `prosci-fix` first.
- **A step breaks the contract.** Revert that step and split it; do not update the callers to hide a
  break in a refactor.
- **The defect turns out to be a behaviour bug.** Say so, stop, and route to `prosci-fix`. Fixing it
  here would be a behaviour change with no test of its own.
- **The target shape needs a new dependency or a new module tree.** That is architecture. Route to
  `prosci-architect` and come back with a decision.

## Acceptance criteria

1. A verification command was run before the first edit, and its output is in the report.
2. The same command was run after, and its output is in the report.
3. A new test pins any behaviour that had none, and it fails if the behaviour changes (show the failure
   by mutating once, then revert).
4. The named structural defect is measurably gone: the count or location statement from step 2 no
   longer holds.
5. The public contract is unchanged, checked by executing it, not by reading it.
6. No behaviour change, no new public export, no unrelated cleanup in the same change set.
