---
name: prosci-review
description: "Review a diff or pull request the factory way: intent, evidence, correctness at the edges, tests that can fail, blast radius, reader load, and hardening at boundaries only. Use before merging your own work, or when the user asks for a review."
---

# Review a change

Read the diff, then the code around it. Reviewing the diff alone finds typos and misses the bug.

## Get oriented first

1. Read the description. State the claim it makes in one line.
2. Read the diff end to end without commenting. You are looking for the shape, not the details.
3. Read the files the diff touches, at least the functions it changes and their callers.
4. Then go back through the checks below in order.

If the diff is over roughly 600 lines, review it by concern, one pass per concern, and say that
you did.

## The seven checks

### 1. Intent

Does the diff do what the description says, and only that? Look for unrelated edits, reformatting,
renamed files, and a fix bundled with a refactor.

Tell: a diff that touches a file the description never mentions. Ask for it to be split, unless
the change is a single mechanical rename.

### 2. Evidence

Is the verification real output, or a claim? Can you rerun it?

- No commands and no output: a finding. The change is unverified.
- Output from a different command than the one the repo uses: a finding, weaker than it looks.
- "Tests pass" with no test in the diff while behaviour changed: a finding.

Rerun the cheapest command yourself when the diff is small. Never accept a result you can produce
in one command.

### 3. Correctness at the edges

The happy path is usually fine. Read the edges.

- Empty input, zero, one, the largest value, a duplicate, a negative.
- The concurrent write, the retry after a partial failure, the second call.
- The error branch: is the error caught where the caller can see it, or swallowed?
- The default when a field is missing, and the behaviour when the network fails.
- Off-by-one in a loop, a slice, a pagination cursor, a date boundary.

Ask of each: what happens when this is null, when this runs twice, when this runs in another
timezone.

### 4. Tests that can fail

Apply both imagined edits to each new test.

- Break the behaviour. If the test still passes, it proves nothing. Common causes: a loose
  assertion, an expected value computed by the code under test, an assertion on data the test
  built itself.
- Move the internals and keep the results. If the test fails, it is pinned to the implementation
  and will break for no reason later.

Also check the direction: does the test assert the requirement, or the code's current output?

### 5. Blast radius

Who else touches this?

- Grep the function name, the field, the event, the route. Count the callers.
- A signature change needs every caller in the diff, or a default that keeps them working.
- A schema change needs the migration, the read path, and the backfill story.
- A shared module change needs the other consumers tested.

Tell: a change to a widely used function with one caller updated.

### 6. Reader load

Could a newcomer follow this in one pass?

- Count the layers between the entry point and the actual work. Collapse a wrapper with one
  caller.
- Hidden state: a module-level variable, a mutable default argument, a field set in one function
  and read in another.
- Names: does the variable name the thing it holds? `data`, `result`, `temp`, `handle` name
  nothing.
- Comments that restate the code. Delete them. A comment earns its place by explaining why.

### 7. Hardening at boundaries only

Validation belongs where data crosses a boundary: user input, config, network, files, a message
queue. Guarding internal types is noise that hides the real contract.

Tell: a null check inside a function whose own signature already forbids null.

## Writing findings

One line each, in this shape.

```
path/to/file.ts:42  blocking  the retry reuses the idempotency key, so the second attempt is
                              deduplicated and the charge never happens
```

Then, after the findings:

- **Blocking**: wrong behaviour, a weakened test, a missing error path a user will hit, a
  security or data loss risk, a secret in the diff.
- **Non-blocking**: naming, structure, a shorter way to write the same thing.
- **Not checked**: what you did not look at, and why.

Skip style a formatter owns. Skip taste with no consequence. A review that manufactures findings
to look thorough wastes the author's time.

## Approving

Approve when the change does the thing, the evidence is real, the edges are handled, and nothing
is hidden. Say that plainly, in one sentence. Then mention the non-blocking items.

Do not approve to be agreeable, and do not block for a preference. If the only objection is that
you would have written it differently, it is not a blocking finding.

## Reply

The verdict, the blocking findings with locations, then the rest, then what you did not check.
If you read only the diff and not the surrounding code, say that.
