---
name: prosci-architect
description: "Decide the shape before code: two viable designs with the interfaces and types they imply, one choice with its consequences, recorded where the repo keeps decisions. Use when a change spans modules, alters a public contract, or when two designs are both defensible."
---

# Architect

The failure this route prevents: the shape of a change is decided inside the third edit, in a reply
that nobody reads again. Six months later a reviewer cannot tell whether the boundary was chosen or
stumbled into.

Architect makes the shape explicit before code exists, and records it where the next person looks.

## When this runs

- The change spans more than one module, or moves a boundary between them.
- A public contract changes: an API, an event schema, a file format, a CLI flag set, a database column.
- Two designs are both defensible and the choice is expensive to reverse.
- `prosci-ship` step 3 has no obvious data shape to name.

## When it does not

- **A single-file change with one caller and an obvious shape.** `prosci-ship`. Say that you
  considered an artifact and skipped it, in one line.
- **Ordering work, not shaping it.** `prosci-plan`.
- **A question about how the current architecture works.** `prosci-investigate`, or
  `prosci-understand` if the whole repo is unfamiliar.
- **Product surface**: flows, states, copy, accessibility. Not a route yet — say so rather than
  using this skill as a proxy for it.

## Inputs

- The requirement, with the acceptance you must meet.
- The constraints from `prosci-understand` or the repo's instruction file: conventions, commands,
  existing patterns.
- The call sites the decision affects. Grep them before drawing anything.

## Procedure

1. **Write the decision as one sentence**, in the form "we will X so that Y". If it takes two
   sentences, it is two decisions; take the first one.

2. **Name the forces.** Three to five, each with a source: a constraint from the repo, a quality you
   must meet (latency, reversibility, operator familiarity), or a fact about the call sites. A force
   without a source is an opinion.

3. **Look for the existing pattern first.** If the repo already answers this shape somewhere, reuse it
   and say where. Inventing a second pattern is a decision in itself and needs its own reason.

4. **Sketch at most two candidate shapes.** More than two is usually one real option and two straw
   men. For each: the module boundary, the interface as actual signatures or types, the direction of
   dependencies, the data flow, the failure mode, and the migration cost.

5. **Choose, and say what would change your mind.** The pick needs a reason tied to the forces, and one
   condition that would reopen it.

6. **Record it.** If the repo has `docs/adr/`, write `docs/adr/NNNN-<slug>.md` with Context, Options,
   Decision, Consequences. If it keeps design docs elsewhere, write there. If it keeps none, write
   `docs/architecture/<slug>.md` and add one line to the instruction file pointing at it. One page.
   Consequences must include reversibility: what it costs to undo, and by when undoing stops being
   cheap. The artifact must also name the command that will verify the decision, so a later reader can
   check the claim instead of trusting it.

7. **Hand back.** Link the artifact, do not implement. `prosci-ship` continues with the chosen shape.

## Output

One artifact, at most a page:

- the decision in one sentence,
- the forces with sources,
- the options with their interfaces,
- the chosen shape and its consequences,
- the condition that would reopen it.

Plus one line in the PR or reply linking the artifact.

## Failure handling

- **Both options fail a hard constraint.** The requirement is wrong, not the designs. Say which
  constraint kills every option and take it back to whoever wrote the requirement.
- **The forces cannot be sourced.** You do not have enough information; stop and say what would settle
  it. Do not invent a comparison table.
- **The repo has three competing patterns already.** Do not add a fourth. Name the one to follow and
  record the other two as debt in the same artifact.
- **The change turns out to be trivial mid-way.** Stop, delete the draft artifact, and say it was not
  warranted. An artifact for a one-file change is noise.

## Acceptance criteria

1. The artifact names at least two options, each with an interface sketch in code, not prose.
2. The chosen option is tied to the named forces; the reason is one sentence a reviewer can disagree
   with.
3. Consequences state the reversal cost, and the artifact names an executable command that verifies
   the decision (a test command, a probe, or a one-line script).
4. No code is changed by this route; the only added files are the artifact and one pointer line.
5. The artifact is at most one page.
6. The eventual pull request links it, or the reply says why no artifact was warranted.
