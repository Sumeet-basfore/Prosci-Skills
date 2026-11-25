---
name: prosci-bar
description: "The definition of done every factory route ends at: six boxes with how to evidence each, the failure modes that catch you, and a report template. Read before you claim a change is finished."
---

# The bar

A change is done when a reviewer can check six things without asking you a question. Run these
before you report, not after someone pushes back.

## 1. It does the thing

The acceptance line from the spec is true, and you showed it.

Evidence: the observable result, pasted. A response body, a rendered element, a row written, an
exit code, a screenshot path. Not "implemented".

Unmet when the behaviour works only in a path you did not drive.

## 2. The checks ran, and you pasted them

The repo's real commands and their real output.

Evidence: the command, then the tail of its output, including the pass or fail line.

Check the environment claim while you are here. A suite that passes because a machine has a
warm cache, a `.venv`, or a `node_modules` is not verified for the next machine. Prefer a command
that bootstraps its own environment, or name the dependency in the pull request.

Unmet when the output has been summarised, paraphrased, or omitted.

## 3. A test would catch the regression

A test fails when this behaviour breaks, and keeps passing when only the internals move.

Evidence: the test name, plus the failing run if you wrote it first.

Unmet when no test exists and no reason is given. A reason is acceptable for a copy change, a
colour, or a path you cannot drive. "Not testable" on its own is not a reason.

## 4. The diff is the smallest one that works

Evidence: the file list, and roughly the line count.

Unmet when the diff contains a dependency, abstraction, config, or option nobody asked for, or
unrelated rot swept in. Say what you left for later instead.

## 5. The change is explained

Why it exists, what it does, what it does not touch, and the verification. A reader who has never
seen the task follows it in one pass.

Evidence: the pull request body, or the commit body.

Unmet when the description narrates the session instead of the change.

## 6. Nothing was hidden

No weakened assertion, no skipped test, no silenced error, no flag flipped to make a check happy,
no claim you did not run.

Evidence: the diff, read once more by you. Look specifically for `skip`, `.only`, `|| true`,
`catch {}`, `# type: ignore`, `@ts-expect-error`, and a raised timeout.

Unmet when anything in that list appears without a line explaining why it is legitimate.

## Failure modes, and the tell that catches them

| the failure | the tell |
| --- | --- |
| claiming a pass from a proxy | you wrote "compiles", "types check", or "should be fine" instead of output |
| fixing the test to fit the code | the assertion changed in a diff whose description says it fixes a bug |
| bundling | the diff touches files the description never names |
| inventing scope | the diff adds an option, flag, or config nobody requested |
| skipping the surface | the suite is green and you never opened the page or ran the command |
| reporting intent | the description says what you meant, and the diff does something else |
| testing the mock | the test asserts what the fake returned, so nothing about real behaviour is proven |
| a green run from a stale build | the command did not rebuild, or ran against an old artifact |

## The definition of done, by change type

| change | evidence required | not evidence |
| --- | --- | --- |
| bug fix | a test that failed before and passes after, with the failing output | "the fix is obvious" |
| feature | the new behaviour exercised on its real surface, plus the failure path | unit test of a helper |
| refactor | same checks green before and after, and the structural defect measurably gone | "it looks cleaner" |
| docs | every changed command run, every changed path exists | reading it back |
| config/infra | the config applied and the effect observed; rollback exercised | YAML that parses |
| release | the artifact installed from scratch and run | a green build |

### Evidence standard

- A command and its output. Not a summary of the output.
- The command must be the one the repo documents; if it differs, say why.
- The failure path counts as much as the happy path: one input that must be rejected, and proof that it is.
- If a check was skipped, say so in the same sentence as the claim, not in a footnote.

### When done is not your call

Route to a human when: the change is irreversible (data deletion, schema change with rows), the check passes but
you cannot explain why, or two requirements contradict each other. "Tests pass" does not resolve a product
decision.

### Anti-patterns

- Green build presented as delivery.
- A test added after the fix, without ever seeing it fail.
- "Covered by existing tests" without naming which one.
- Marking done while a known limitation is unstated.

## Report template

Copy this into your reply and fill it honestly.

```
done?
1 does the thing     yes | no  (evidence: ...)
2 checks ran         yes | no  (command: ..., result: ...)
3 regression test    yes | no  (test: ...)
4 smallest diff      yes | no  (files: ..., ~N lines)
5 explained          yes | no  (link: ...)
6 nothing hidden     yes | no  (noted: ...)
unproven: ...
```

An unmet box ships only with the operator's agreement, in writing. Say which box is unmet and what
it would take to close it.

## Reply

The six boxes, each true or explicitly unmet with the reason, then the one thing you would check
next if you had another ten minutes.
