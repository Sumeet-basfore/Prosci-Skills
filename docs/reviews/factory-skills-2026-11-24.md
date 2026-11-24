# Factory skills review, 2026-11-24

Nine skills reviewed by a Codex worker on gpt-6-luna at xhigh effort, each rated on five
dimensions. Two scored below 8, were rebuilt, and were re-rated by a second worker. All nine now
score above 8.

## First pass

| skill | trigger | specific | failure | consistency | concise | overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| factory | 9 | 9 | 9 | 5 | 7 | 7.8 |
| factory-ship | 9 | 9 | 9 | 8 | 7 | 8.4 |
| factory-fix | 9 | 9 | 9 | 9 | 8 | 8.8 |
| factory-review | 9 | 9 | 9 | 9 | 8 | 8.8 |
| factory-bar | 9 | 9 | 9 | 8 | 8 | 8.6 |
| factory-investigate | 9 | 8 | 9 | 9 | 7 | 8.4 |
| factory-docs | 8 | 9 | 8 | 5 | 7 | 7.4 |
| factory-release | 9 | 9 | 9 | 9 | 8 | 8.8 |
| factory-init | 8 | 8 | 8 | 8 | 8 | 8.0 |

The dimensions: does the trigger fire at the right moment, is it specific enough to follow without
guessing, does it block a real failure, is it consistent with its siblings, and does it carry prose
that changes no decision.

## The finding

Both low scores were one defect, and it was in the router. The docs row read "a change alters a
command or a default", so a behaviour change that also invalidated a documented command could be
routed to the docs route alone. The documentation would then describe a change that did not exist
yet. `factory-docs` carried the same ambiguity in its own description.

Fixed in PR #12.

- The router has two rows now. Documentation-only work goes to `factory-docs`. A behaviour change
  that invalidates a claim runs its own route to a merged pull request, then the docs route.
- `factory-docs` says the same in its description and its opening paragraph, and names the one
  legitimate exception: documentation that is wrong today with no code change behind it.

## Re-rate, after the fix

| skill | trigger | specific | failure | consistency | concise | overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| factory | 9.7 | 9.3 | 9.5 | 9.2 | 9.0 | 9.3 |
| factory-docs | 9.4 | 9.2 | 9.3 | 9.4 | 9.0 | 9.2 |

The re-review's verdict, in its own words: "the original finding is closed: the router sends
command, flag, or default changes through the behaviour route before docs, and the docs route
describes its documentation-only boundary."

## What the review did not cover

- The three skills scoring exactly on a dimension line, `factory-init` at 8.0 overall, were passed
  rather than proven. If a later run scores one below 8, it gets rebuilt.
- Whether the skills change agent behaviour in practice. Ratings measure the text. The first real
  change in a test project is the only evidence that matters, and it has not happened yet.

## A note on the worker protocol

Three dispatches ended their turns without calling `worker_done`, which raised an escalation each
time and delivered the report in chunks. The third worker named the cause: `orca` is not on `PATH`
inside the worker environment, so the command it was told to call cannot run.

Two consequences for future dispatches.

1. Put the CLI path in the kickoff, or export it in the worker's environment. A worker cannot obey
   a protocol instruction that depends on a binary it cannot see.
2. Ask for the smallest complete artefact in one turn. The table is what the review needed, and it
   arrived whole because the brief asked for a table and nothing else around it.

Both reviews are still usable. The scores are the worker's, the fix and this write-up are the
operator's.
