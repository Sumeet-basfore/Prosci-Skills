---
name: prosci-plan
description: "Turn a requirement into ordered, independently verifiable work units, with the parallel set and the approval boundaries named before code is written. Use when the work spans more than one commit, file, agent, or session."
---

# Plan

The failure this route prevents: work that is one big commit, or five agents editing the same file,
or a plan that lists tasks nobody can check. A plan is useful only when each unit can be verified and
reverted on its own.

## When this runs

- The work needs more than one commit, or touches more than one module.
- More than one agent or person will do parts of it.
- The work spans sessions and the next session needs to know where it stopped.
- A change is irreversible enough that the order matters: migrations, public contracts, deletions.

## When it does not

- **One small change.** `prosci-ship` already sequences it. A plan for a two-line fix is ceremony.
- **Choosing the shape.** `prosci-architect`. Planning a design you have not chosen plans the wrong
  thing.
- **Finding the cause of a failure.** `prosci-investigate`, then `prosci-fix`.
- **A question.** `prosci-investigate`.

## Inputs

- The requirement and its acceptance, in checkable form.
- The architecture decision, if one exists.
- The repo's verified commands for test, typecheck and build.

## Procedure

1. **Restate the outcome as a check.** One sentence plus the command or assertion that proves it. If
   you cannot write the check, the requirement is not ready; stop here.

2. **Cut into work units.** A unit is one purpose, one reviewable diff. For each: the files it touches,
   the check that proves it worked, and how to undo it. If a unit has no check, it is not a unit — it
   is a note.

3. **Order by real dependencies only.** An edge exists when units touch the same file, share a lock,
   port, branch or scratch directory, or when one is verified after the other. Everything else is not
   a dependency; drawing it anyway turns a plan into a queue.

4. **Find the parallel set.** Units with disjoint files and no shared process can run at once. Say how
   many workers, and give each a brief that stands alone: goal, files, check, and what it must not
   touch. Two units that both edit the instruction file are not parallel, however unrelated the edits.

5. **Name the approval boundaries.** Mark every unit that is irreversible or user-visible: schema
   changes, public API changes, deletions, spending, anything a customer sees. Those stop for a human
   decision; the rest do not.

6. **Decide what happens when a check fails.** Default: revert the unit, do not patch forward. Say which
   failures would instead justify stopping the whole plan.

7. **Record it where it will be read.** The plan may live in the reply or the PR body when one session
   finishes the work. Write `docs/plan/<slug>.md` when the work spans sessions, more than one agent or
   person takes a unit, or the project requires a durable record. A plan nobody can find is a plan
   nobody follows, and a plan file for a two-hour task is a file nobody reads twice.

## Output

- The outcome and its check.
- A table of units: purpose, files, check, rollback.
- The dependency edges, each with its reason.
- The parallel groups, with the brief for each worker.
- The approval boundaries.

## Failure handling

- **The requirement has no check.** Stop. Return to whoever wrote it with the specific question that
  would make it checkable.
- **Two units cannot be separated.** Merge them and say so; do not plan a split that will conflict.
- **The plan will not fit the session.** Cut it at a unit boundary and record the stopping point so the
  next session starts cleanly.
- **The work turns out to be one change.** Stop planning, do it, say the plan was discarded.

## Acceptance criteria

1. Every requirement maps to at least one unit, and every unit has a runnable check.
2. Every dependency edge names its reason; no edge is "probably related".
3. Every parallel group contains only units with disjoint files and no shared process.
4. The approval list names each irreversible or user-visible step.
5. Each unit has a rollback that is smaller than the unit.
6. The plan exists on a surface that matches its lifetime: the reply or PR body for one session, a file
   for multi-session or multi-agent work.
