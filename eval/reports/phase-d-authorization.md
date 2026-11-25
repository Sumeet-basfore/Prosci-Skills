# Phase D — authorization discrepancies

Two questions, both answered by the same class of defect: the controller trusted inputs it should have capped.

## 1. Three executions under an authorization for one

**What happened.** Three real runs were made (a lost-evidence run, a propagation-defect run, and the successful
one). Each started paid agents.

**Why.** The gate was `--approve <plan-hash>`. A plan hash identifies a plan; it does not expire, and nothing
recorded that an execution had already happened. The same hash authorized the first run and the third
identically. The intermediate failures were treated as "not real attempts", but the agents had already run and
spent money — the failure was in my recording, not in the spending.

**Fix.** `bin/lib/exec-auth.mjs` holds an authorization record on disk: `maxExecutions`, `maxRetriesPerUnit`,
`maxRequests`, plus `executions` and `requestsUsed`. `claimExecution` increments or refuses. A paid backend now
requires `--authorization <file>`; the plan hash alone is rejected with *"the plan hash alone is not a spend
approval"*. The record is a file so a crash cannot reset the counter, and it is bound to the plan hash so it
cannot be reused for a different plan.

## 2. Three attempts where one retry was authorized

**What happened.** `u2-implement` ran three times. The authorization said one retry.

**Why.** Retries came from the plan (`u2.budget.retries = 2`); the controller passed the plan's number straight
to the loop. The authorization was prose, and nothing compared the two. The plan was written before the
authorization and was never re-read against it.

**Fix.** `effectiveRetries(record, planRetries) = min(plan, authorized)`. The ledger now records both
`planRetries` and `retriesClamped`, so a clamp is visible rather than silent. With no authorization record,
retries default to zero.

## 3. Request budgets across failed and interrupted runs

The proxy's `PROXY_MAX_REQUESTS` was set per process, so each attempt received a fresh budget — three attempts
meant three budgets. Requests are now charged per attempt against the authorization record, persisted as they
are spent, and the unit fails when the aggregate is exhausted. A crashed attempt keeps its charges.

## 4. Regression coverage

`bin/test/exec-auth.test.mjs` (7 tests): one authorization, one execution; refusal for a different plan; the
record surviving a restart; retries clamped down from 5 to 1; zero retries without a record; request
aggregation across attempts including the negative remainder; three executions consuming three claims.

`bin/test/swarm-run.test.mjs` (3 new, 16 total): a second execution refused with `already used`; a plan asking
for 5 retries produces 2 attempts and records `{plan: 5, authorized: 1}`; the ledger carries the authorization
block and the request usage.

## 5. What this does not fix

- The controller still cannot see what the proxy actually received; the request charge is one per attempt, an
  estimate of the smallest possible spend, not a measurement.
- An authorization file is a local convention. Anyone can delete it and re-approve. It prevents accident, not
  intent.
- No paid run was made to validate the fix. The tests drive the fake backend, which is the only one that can be
  exercised without spending.
