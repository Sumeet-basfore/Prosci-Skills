# Test design that earns its runtime

A test earns its place by failing when the behaviour breaks. Everything else is documentation with a CI
cost.

## 1. What to test, in order

1. **The behaviour the change introduces**, at the boundary the user or caller sees.
2. **The failure path the change makes possible** (empty, invalid, concurrent, timeout).
3. **The regression** for any bug being fixed: the exact input that was broken, asserted.
4. **The contract**: exported shapes, status codes, file formats, flag behaviour.

Not: implementation details, private helpers, mocks of your own code.

## 2. Shape of a good test

```
name: "a refund on an empty basket returns 0 and does not throw"
setup: the smallest state that reproduces it
act: one call, one command, one request
assert: the observable outcome, and the exit code/status
```

One behaviour per test. A test with three assertions on three behaviours fails for three reasons and
names none of them.

## 3. Prove the test can fail

Before declaring green, break the code deliberately once — change the constant, invert the condition,
remove the guard — and watch the test go red. Revert. A test you have never seen fail is a test you cannot
trust. This takes thirty seconds and catches the most common form of useless test.

## 4. Fixtures

- Inline the smallest fixture in the test; move it to a file when it is shared by three or more tests.
- Fixtures must be readable: a JSON blob named `data.json` with 200 lines hides the case being tested.
- No network, no clock, no randomness without an injection point.
- If a test needs a database, use the project's existing harness; do not introduce a second one.

## 5. Speed

- Unit: milliseconds. If a test is slow, it is an integration test; move it and label it.
- Keep the default command fast enough that people run it before pushing.
- One slow suite in CI is fine; a slow local command is skipped by everyone.

## 6. What not to do

- Do not assert on log strings, stack traces or ordering that is not part of the contract.
- Do not mock the thing you are testing.
- Do not add a test that passes on the broken version — check it fails first.
- Do not lower coverage thresholds or skip a failing test to land a change.

## Checklist

- [ ] one behaviour per test, named as the behaviour
- [ ] the failing path is covered
- [ ] the test was seen failing once
- [ ] no network, clock, or unseeded randomness
- [ ] the default test command is still fast
