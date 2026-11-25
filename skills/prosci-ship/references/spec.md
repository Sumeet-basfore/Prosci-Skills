# Writing the spec before the diff

The spec is one page that makes the change reviewable. It is not a design document and not a ticket
restatement.

## 1. Six lines

```
goal: the user-visible outcome, one sentence
non-goals: what this change deliberately does not do
input → output: the data shape that changes, concretely
constraint: the one thing that decides the implementation
proof: the command that shows it works
rollback: how to undo it
```

If `input → output` cannot be written concretely, the change is not understood yet.

## 2. Data shape first

Write the shape, not the type system:

```
before: { lines: [{ cents }] }
after:  { lines: [{ cents, discountCents }], total }
```

Then name what happens to existing records, existing callers, and existing serialized data. Most
production bugs live in the third one.

## 3. Boundaries

- What is in this change, what is a follow-up.
- Which files/modules you expect to touch. If the list grows while implementing, say so in the PR.
- What you will not refactor while you are in there.

## 4. Proof

One command that fails before and passes after. If the only proof is "it compiles", the change is not
verified. If the proof needs a fixture, name the fixture.

## 5. Failure modes worth writing down

- Empty input, duplicate, concurrent write, retry, partial failure.
- For each: what happens, and whether that is acceptable.
- Any that you choose not to handle goes in the PR description as a known gap.

## Checklist

- [ ] goal and non-goals in one sentence each
- [ ] data shape before/after
- [ ] existing records and callers considered
- [ ] one command that proves it
- [ ] rollback named
- [ ] known gaps listed
