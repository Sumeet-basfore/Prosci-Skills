# Verifying a browser surface

Only valid if a browser is actually available. If it is not, say so — never narrate a page you did not
load.

## 1. Availability check, first

- Is a driver installed and runnable (`playwright`, `puppeteer`, `chrome --headless`)?
- Can it reach the app's URL in this environment (network, auth, seeded data)?

If either answer is no, stop and report: "browser verification unavailable", with the reason. That is a
legitimate result and a better one than a fabricated walkthrough.

## 2. What to check

| check | how |
| --- | --- |
| the flow completes | click the path a user takes, assert the end state |
| states render | trigger empty, loading (throttle), error (bad input or mocked failure), success |
| keyboard path | Tab through, activate with Enter/Space, Esc closes modals |
| focus visibility | screenshot with focus on the darkest and lightest surfaces |
| reflow | 320px width, and 200% text zoom |
| console | no errors or failed requests during the flow |
| network | no unexpected calls, no duplicated writes on double submit |

## 3. Evidence

- screenshot paths per state, named by state,
- the sequence of actions (a short script is better than prose),
- console output on failure,
- the URL and commit being tested.

## 4. What screenshots do not prove

A screenshot is a moment: it does not prove focus order, announcement to a screen reader, or behaviour
under slow networks. State the limits of what you captured. For screen-reader behaviour, either use a real
one or mark it unverified.

## 5. When a check fails

Record the failing state first (screenshot + console), then the reproduction. Do not fix it in the same
step: the fix belongs to `prosci-fix`, and mixing them hides which action changed the result.

## Checklist

- [ ] availability confirmed before promising anything
- [ ] happy path + at least two non-happy states
- [ ] keyboard path attempted
- [ ] console and failed requests inspected
- [ ] evidence named and reproducible
- [ ] unverified dimensions listed
