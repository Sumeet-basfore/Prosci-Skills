---
name: factory-review
description: "Review a diff or pull request the factory way: behaviour, evidence, scope, and the bugs a test suite cannot see. Use before merging your own work, or when the user asks for a review."
---

# Review a change

Read the diff, then the code around it. Reviewing the diff alone finds typos and misses the bug.

## Check, in this order

1. **Intent.** Does the diff do what the description says, and only that? Unrelated edits,
   reformatting, or a renamed file in a fix is a request for a separate change.
2. **Evidence.** Is the verification real output, or a claim? Can you rerun it? If the pull
   request says tests pass and shows nothing, that is a finding.
3. **Correctness at the edges.** Empty input, zero, one, the largest value, the duplicate, the
   concurrent write, the retry after a partial failure. Read the error path, not only the happy
   path.
4. **Tests that can fail.** A test asserting the code's own output, or a loose assertion, proves
   nothing. Ask what breaks it. If nothing breaks it, say so.
5. **Scope of the blast radius.** Who else calls this function, reads this field, or depends on
   this file? Grep the callers before judging the signature change.
6. **Reader load.** Could a newcomer follow this in one pass? Collapse the one-caller wrapper,
   delete the comment that restates the code, name the variable for the thing it holds.
7. **Hardening at the edges only.** Validation belongs where data crosses a boundary: user
   input, config, network, files. Guarding internal types is noise.

## Report

Findings first, each as `path:line`, what breaks, and the smallest fix. Then what you verified
yourself. Then what you did not check.

- Blocking: wrong behaviour, a weakened test, a missing error path a user will hit, a security
  or data loss risk.
- Non-blocking: naming, structure, a shorter way to write the same thing.
- Skip: style a formatter owns, and taste with no consequence.

Say plainly when the change is good. A review that manufactures findings to look thorough
wastes the author's time.

## Reply

The verdict, the blocking findings with locations, then the rest. If you only read the diff and
not the surrounding code, say that too.
