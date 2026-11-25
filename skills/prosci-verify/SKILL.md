---
name: prosci-verify
description: "Produce evidence that the software actually works: exercise the real surface (CLI, HTTP API, browser, worker), compare what happens against the requirement, try the failure paths, and report discrepancies. Use when someone needs proof rather than a green unit test."
---

# Verify

The failure this route prevents: "it works" as a claim built from a passing unit test, when the CLI
crashes on an empty input and nobody ran it. Verify produces evidence by running the thing, and reports
the difference between what was promised and what happened.

## When this runs

- A behaviour claim needs proof on the real surface, not in a mock.
- A release, a migration, or a deploy is about to happen and someone has to check it.
- A bug report says "it does not work" and the suite is green.
- A requirement has an acceptance check that a unit test cannot reach: a flag, an endpoint, a page, a
  job that must run end to end.

## When it does not

- **Deciding whether the work is done.** That is `prosci-bar`: the shared standard. Verify produces the
  evidence; the bar judges it.
- **Reviewing code.** `prosci-review`.
- **Fixing what you find.** This route reports; `prosci-fix` changes behaviour. Mixing them hides which
  of your actions changed the result.
- **Testing the internals directly when a public surface exists.** Unit tests belong to the change;
  this route runs what a user runs.

## Inputs

- The requirement or claim, in one sentence.
- The surface: the command, URL, page, or job name, and how to reach it.
- The available tools, checked before promising anything: is the browser driver installed, is the server
  startable, is the API key present?

## Procedure

1. **Write the claim and its check before running anything.** "Running `report --total` on an empty file
   prints 0 and exits 0." A check written after seeing the output is a description, not a verification.

2. **Check the harness exists.** Run the tool with `--version`, hit the health endpoint, load the page.
   If the required tool is missing, say so and stop — a verification you could not run is not a pass.

3. **Exercise the real surface.** Build or start the software the way a user would. Run the CLI, call
   the endpoint, load the page, trigger the job. Capture the exact output, status code, or screenshot
   path.

4. **Try the failure paths that matter.** Empty input, duplicate submit, unauthorized request, malformed
   payload, network failure, retry. Each one you can name and run. A happy path alone is a demo, not a
   verification.

5. **Compare against the requirement, not against your expectation.** State what happened, what was
   required, and the difference. If they differ, that is a finding — do not "fix" it in the same step.

6. **Record the evidence so someone else can reproduce it.** Command lines, exit codes, response bodies,
   screenshot paths, the commit being verified. "Verified manually" is not evidence.

7. **Report discrepancies with a severity.** Blocking: the requirement is not met, or data is lost.
   Minor: works but differs in text, order, or performance. Note what you did not test and why.

## Output

- The claim and the check that was written for it.
- The commands or interactions run, with their real output.
- Pass or fail per check, against the requirement.
- Discrepancies with severity and a reproduction.
- What could not be tested, and why.

## Failure handling

- **A required tool is unavailable.** Say which, stop, and report "not verified" — never simulate an
  interaction and describe it as if it ran.
- **The software will not start.** That is the finding. Report the error and the environment; do not
  spend the session fixing the build unless asked.
- **The surface is destructive or touches production.** Stop. Verification against a copy or a sandbox
  first; ask before pointing it anywhere real.
- **The check passes but feels wrong.** Widen it: another input, another state, another failure path.
  Say when you stopped widening.

## Acceptance criteria

1. Every check was written before the run, and the report shows it.
2. Every claim of "works" is attached to a command, a status code, or a captured artifact — no
   reconstructed results.
3. At least one failure path was exercised, or the report says why none applies.
4. Discrepancies are compared against the requirement, not against the agent's expectations.
5. Anything untested is listed as untested; nothing is reported as verified without evidence.
6. The evidence is reproducible: a reader can run the same commands against the same commit.
