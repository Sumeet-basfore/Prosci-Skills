# Seven-day private preview

Prosci is feature-frozen at seventeen skills for this period. The goal is to find out whether it helps
real work, not to improve a score. Nothing here is a benchmark.

## What counts as a trial

A real task on a real project, chosen because you needed it done:

- a GitHub issue, a bug someone reported, a feature a user asked for, a migration that has to happen;
- the change lands as a pull request or commit on a branch that a human reviews;
- if the task is small enough that Prosci adds nothing, say so in the record — that is a result.

Not a trial: a synthetic fixture, a task invented to exercise a skill, or anything whose acceptance is a
number the agent wrote itself.

## Ground rules

1. **Real work only.** If you would not have done the task this week, it is not a trial.
2. **Record as you go.** Fill `trial-record.md` before the context is gone; a record written from memory
   three days later is a summary, not evidence.
3. **Fix demonstrated defects only.** A skill that misfires on a real task gets a focused fix and a
   regression scenario. No tuning to make a metric look better.
4. **No new skills, no new runtimes, no expansion.** The three deferred skills stay deferred.
5. **Human approval boundaries stay.** An unresolved or high-risk merge, a destructive git operation, or a
   publication needs a person to say yes in writing.
6. **Evidence stays local.** Records may be committed only when they contain no credentials, customer data
   or private repository detail. Otherwise keep the full record locally and commit a redacted summary.

## Minimum outcome before public alpha is reconsidered

- At least **one human-reviewed, successfully merged** result from a real task.
- Install path confirmed from scratch by someone other than the author.
- Every record states whether Prosci materially helped, including the "no" answers.
- No unexplained failure: each observed failure is either fixed with a regression test, or written down as
  a known limitation with its trigger.

## Stop conditions

Stop the preview and fix the workflow, rather than pushing through, if:

- two consecutive trials need more than two human corrections each;
- an agent changes behaviour nobody asked for and the checks do not catch it;
- a merge or destructive operation happens without the approval required above.

## What we will not claim afterwards

Not "improves productivity" and not "improves code quality". At most: "on these N tasks, with these
corrections, these results were merged." The records are the claim.
