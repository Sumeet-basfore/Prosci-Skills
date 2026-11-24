# Factory v2, the orchestrator

Written 2026-11-24. Research first, then the proposed shape, then the one decision that has to be
made before anything gets built.

## What already exists

Three halves of one idea, built separately and not connected.

**Forge v0.2** at `projects/forge`, repo `Sumeet-basfore/forge`. Eleven skills (planning,
specification, architecture, implementation, testing, code-review, documentation, research,
release, project-init, orchestration), four rule files (agents, engineering, git, safety), four
project templates per stack, and a task-document model. Its `orchestration` skill defines a
Liaison that splits work into SCOUT and SHIP tasks with dependency ordering, disjoint
`allowed_paths`, worktree quarantine per task, and human gates at ACCEPTED and MERGED.

**pstack** in the shared skill store, 59 skills. One mode skill (`poteto-mode`) routes by task
type to twenty-two short playbooks, twenty-four named principles that every judgement cites, a
worker contract (`worker.md`, eleven lines), and a per-role model rule.

**This repo**, the gate. `bin/context-doctor` proves a repo's commands resolve,
`bin/verify` runs them and writes a receipt, `bin/install-gate` puts a required check on
GitHub. The receipt is the evidence; the check is the thing an agent cannot edit.

## The gaps, by piece

| piece | has | missing |
| --- | --- | --- |
| forge | procedures, rules, task vocabulary, worktree discipline | a runtime. `forge mate merge <TASK_ID>` is called by its orchestration skill and the CLI on this machine has no `mate` subcommand |
| pstack | routing, playbooks, principles, worker contract | persistence, evidence, a real gate. Any agent can claim a pass |
| the gate | a runnable verdict and a receipt | anything that decides what to build, or how |

So the factory is not a new thing to invent. It is a runtime and an entry point for parts that
already exist.

## Proposed shape

One mode skill, borrowed from pstack's shape and pointing at forge's procedures.

```
factory-mode            restates the goal, picks a route, owns the gate and the models
  routes to             projects/forge/skills/<procedure>/SKILL.md
  dispatches            Orca workers, one per independent unit, gpt-6-luna
  requires              bin/verify receipt before any claim of done
  lands                 pull request plus the required `factory` check
  records               Orca Run and Tasks, one brief per Task
  learns                receipts, then the weekly numbers
```

A route is a chain, not a skill. Three to start, chosen because they are the ones actually run
on this machine.

| intent | chain | done predicate |
| --- | --- | --- |
| feature | specification, planning, architecture, implementation, testing, code-review | receipt PASS on the PR head, check green |
| bug fix | research, testing (failing test first), implementation, code-review | the new test fails before the fix and passes after, same receipt |
| refactor | architecture, implementation, testing, code-review | receipt PASS, and no test assertion changed |

Each route ends in the same two steps, so the last two lines of every route are the same. That
repetition is the point. It is what makes the gate unavoidable rather than remembered.

## What forge contributes, unchanged

Its `rules/` are the invariants the mode skill cites instead of restating. Its SCOUT and SHIP
distinction is the right first cut for delegation, because a read-only investigation and a
mutation want different sandboxes and different evidence. Its `allowed_paths` idea becomes the
scope line in each worker brief.

## The decision

Forge keeps task state in `.forge/tasks/<ID>.md` with a status machine. Orca keeps it in a Run
with Tasks and dispatches. Two records means drift, and the drift will show up as a task marked
ACCEPTED with no receipt, or a merged branch with no task document.

Recommendation, Orca owns execution state. A Run per objective, a Task per unit, dispatch ids as
the handle. Forge's task document survives as the brief text inside the spec, not as a second
state machine. Its statuses collapse into what actually has a runtime: dispatched, reported,
verified, merged. The vocabulary SCOUT and SHIP stays, in prose.

The alternative is to keep `.forge/tasks` authoritative and treat Orca as transport. That works
only if something reconciles the two, and that reconciler is a new program to write and maintain.

## First steps, in order

1. `factory-mode` skill in `projects/forge/skills/`, forty lines, no new prose beyond the routing
   table, the gate contract, and the model policy. It points at the eleven existing procedures.
2. `worker.md` in the same repo, adapted from pstack's: worker boots by reading this file, the
   bar is the brief, evidence is a receipt id, no questions to the human, PRs open ready for
   review.
3. Three routes only. Feature, bug fix, refactor.
4. One real run on `lore`, which has a working contract and depends on nothing else.
5. Only then widen to the other procedures, and add the fourth route, investigation, which is
   read-only and cheap to get wrong.

## What stays unproven

Whether a mode skill actually improves anything over the current habit of asking directly. The
measure is in `docs/plan/factory-v1.md`: merged PRs per week against a fix-commit share that must
not rise. If the mode skill raises throughput and the share climbs with it, the routing is
selecting for speed and the routes need a harder done predicate, not more of them.
