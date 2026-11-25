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

## Decision rules and worked examples

### Forces that actually decide a shape

| force | how it shows up in the design | how to check it |
| --- | --- | --- |
| reversibility | migration cost, deprecation window | "what breaks if we undo this in a month?" |
| coupling | how many call sites change together | count the callers that would need editing |
| failure blast radius | what a crash takes down | trace the retry and timeout path |
| operational familiarity | can the on-call read it at 3am | is the state visible in a log or a table |
| throughput | rows, requests, bytes per second | the 10× number, not today's |
| contract lifetime | who consumes the type, for how long | external clients, persisted rows, published events |

Three forces with sources beat eight without. If two options tie on every force, the cheaper one to delete
wins.

### Interface rules that prevent most review findings

- **Narrow waist.** One function, one job; if the signature needs a boolean to pick behaviour, it is two
  functions.
- **Errors are part of the interface.** Say what fails and what the caller can do: throw, return a result
  union, or return null with a reason. Pick one per module and keep it.
- **Idempotency where retries exist.** A write that can be retried needs a key or a natural identity; otherwise
  the design has an unowned duplicate path.
- **No ambient state.** A function that reads a global, the clock, or the environment is untestable and
  hides a parameter.
- **Bounded queues and lists.** Unbounded growth is a design decision, sometimes the right one — say so.

### Worked example: where does the retry live?

Requirement: the invoice sync must survive a flaky vendor API.

Option 1 — retry in the client:

```js
// src/vendor.mjs
export async function withRetry(fn, attempts = 3) { /* backoff, jitter */ }
export async function fetchInvoice(id) { return withRetry(() => http.get(`/invoices/${id}`)); }
```

Option 2 — retry in the queue consumer:

```js
// src/consumer.mjs
export async function handle(message) {
  try { await fetchInvoice(message.id); }
  catch (e) { throw e; } // the queue redelivers with backoff and a dead-letter
}
```

Option 1 wins **only if** the caller cannot wait for a redelivery and there is no queue. With a queue, option 2
wins: the retry policy is visible in one place, poison messages reach a dead-letter, and the client stays a thin
adapter. Recording the loser and why is the point of the artifact — six months later someone will ask.

### Anti-patterns

- **Strawman options.** Two choices where one is obviously broken. If the loser has no defender, the comparison
  is theatre.
- **"Flexible for the future".** An abstraction with one caller is a promise you will maintain for a user who
  has not appeared.
- **Decision by diagram.** A box diagram with no interface sketch hides the hard part: the types and the error
  contract.
- **Rewriting the interface and the implementation together.** Then a regression cannot be attributed.

### Reversibility cost, concretely

| decision | undo cost | when it stops being cheap |
| --- | --- | --- |
| rename a private function | minutes | never |
| split a module | an afternoon | when callers import both |
| change a function signature | scales with callers | when published to consumers |
| add a database column | cheap | never (data outlives code) |
| change a column's meaning | a migration and a backfill | as soon as rows exist |
| publish an event shape | a version and a dual-write window | when a consumer depends on it |

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
