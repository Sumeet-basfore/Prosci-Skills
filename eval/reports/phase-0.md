# Phase 0 report, 2026-11-24

Status: foundation built, deterministic layers green, one L3 smoke run done, **the full behavioural
baseline has not run**. Phase 0 is therefore not complete. Section 6 is the approval this report
exists to request.

## 1. What was built

| piece | path | state |
| --- | --- | --- |
| L1 routing, deterministic | `eval/harness/routing.mjs` | green, 22 scenarios |
| L2 install, deterministic | `eval/harness/install.mjs` | green, 5 harnesses |
| installer | `bin/install-skills` | 11 behaviour tests green |
| fingerprint | `eval/harness/fingerprint.mjs` + `eval/skills.lock.json` | green, 9 skills, 0 drift |
| L3 runner | `eval/harness/behaviour.mjs` + `score.mjs` | smoke only |
| fixtures | `eval/fixtures/` | 4, committed, no dependencies |
| routing scenarios | `eval/scenarios/routing/` | 22, of which 8 negative |
| behaviour scenarios | `eval/scenarios/behaviour/` | 6 |
| CI | `.github/workflows/factory.yml` | L1, L2, fingerprint on every PR |

The repo's own contract is still `node --test bin/test/*.test.mjs`, now 32 tests. No skill file was
changed: `eval/skills.lock.json` records the nine at their current hashes, and the tag
`v0.1-eval-baseline` freezes the commit they came from.

## 2. L1, routing, deterministic

```
22 scenarios (8 negative), 9 rows, 0 failures, 1 known
```

Coverage, dead rows, ambiguity, and negative routing are all checked, plus drift between the keyword
map and the router table in both directions.

One known failure, kept visible rather than tuned away.

**D-001.** The router's stacked row for a behaviour change that also alters a documented command
names only the docs route, so a request that needs both cannot be matched by the table. Scenario
`route-ship-then-docs` fails on the ambiguity, which is the honest result. The fix is a router edit,
and the rule for this phase is that skill defects get their own PR with the scenario as the
regression test. Not fixed here.

What L1 does not prove: that a model reads the table the way the keyword map does. It is a
structural check, reported as one.

## 3. L2, installation, deterministic

```
harness   dir                          filesystem  discovery   behaviour
pi        ~/.agents/skills             pass        not tested  phase 1
claude    ~/.claude/skills             pass        not tested  phase 1
codex     ~/.codex/skills              pass        not tested  phase 1
cursor    ~/.cursor/skills             pass        not tested  phase 1
opencode  ~/.config/opencode/skills    pass        not tested  phase 1
```

Each harness is tested in a throwaway HOME: install, verify nine files and every relative reference,
re-install, remove, and assert the directory is back to its prior state. `omp` has no skills
directory on this machine and is documented as unsupported.

Two defects were found and fixed inside the installer during this work, both by its own tests.

- A second install treated the first install's own entries as foreign and refused. The ownership
  check read the marker it had just reset instead of the marker from the previous run.
- A repair after an interrupted install re-created entries but a test wrote a marker with no entry
  list, so the repair could not tell an owned directory from a stranger's. The installer now records
  each entry as it creates it, and a directory the marker does not list is never touched.

One test corrupted the real repository before it was fixed: a link-mode check wrote through the
symlink into `skills/prosci-docs/SKILL.md`. Reverted, and every mutating test now uses `--copy`. The
lesson is recorded here because it is the same class of mistake the installer is designed to prevent.

## 4. L3, behaviour, smoke only

Two runs, one scenario (`beh-broken-test`), one repeat, vanilla and current, interleaved.

| config | neutral score | acceptance | route named | changed files | tokens | cost |
| --- | ---: | --- | --- | --- | ---: | ---: |
| vanilla | 4 / 4 | pass | n/a | 1 | 14,893 | $0.0021 |
| current | 4 / 4 | pass | **no** | 1 | 16,679 | $0.0026 |

Both configurations found and fixed the failing assertion. The Prosci configuration did not name or
load its route, even though the skills were present in its system prompt. That is a measurement, not
a failure of the harness, and it is the first evidence about behaviour rather than prose.

Two facts about isolation, both measured.

- An unisolated Pi session on this machine builds a 215,220-token system prompt from the 2,206
  installed skills and fails before the task starts. With a throwaway HOME the same session is
  13,124 tokens including a tool call.
- `vanilla` is not skill-free. The harness itself carries 87 skills; `current` carries 96. The delta
  is exactly the nine Prosci skills, which is the comparison the amendments asked for.

## 5. What this does not show

- Six scenarios at three repeats is preliminary evidence, not proof. Nothing here separates Prosci
  from model variance.
- One scenario does not test the router, the review route, the docs route, or the guard.
- Wall-clock time was recorded and is not used as a pass criterion.
- Discovery and behaviour are untested on four of the five harnesses. Only Pi has a behavioural
  smoke run, and it is one scenario.
- No second model. A finding that depends on Haiku at low thinking may not survive a different model.

## 6. The approval this report requests

The full baseline would be: 6 scenarios × 2 configurations × 3 repeats = **36 runs**.

| item | value |
| --- | --- |
| model | `anthropic/claude-haiku-4-5` |
| thinking | `low` |
| configuration | isolated HOME per run, fixture copied to a neutral path, configs interleaved with the order flipped each repeat |
| measured cost per run | $0.0021 to $0.0026 in the smoke |
| estimated total cost | **$0.10 to $0.20** |
| estimated wall time | 15 to 25 minutes |
| isolation guarantee | no access to the real HOME, no other project repos, no network writes beyond the model call, credentials copied into the throwaway HOME and deleted with it |

Credentials limitation, stated plainly: the model call needs an API key, so a copy of
`~/.pi/agent/auth.json` exists inside the temp HOME for the duration of each run. It is deleted with
the directory, never committed, and never copied into the workspace the agent can read. A run cannot
be both authenticated and credential-free on this harness, and pretending otherwise would be a false
guarantee.

Approval is requested for the spend above, and for the choice of model and effort. If a different
model is wanted, the estimate changes and the smoke should be repeated first.

## 7. Acceptance criteria, scored

| # | criterion | state |
| ---: | --- | --- |
| 1 | 20+ routing scenarios, 6+ negative, with expect, forbid, why | met, 22 and 8 |
| 2 | installer passes L2 on 4+ harnesses with committed evidence | met, 5 harnesses, this report |
| 3 | `--remove` restores the prior state, proven by a test | met |
| 4 | baseline tag, matching lockfile, reproducible install | met, `v0.1-eval-baseline` |
| 5 | L1 and L2 in CI, under 10 seconds | met, wired into the existing check |
| 6 | 6+ behaviour scenarios, one full L3 series at 3 repeats | **partially met: 6 scenarios exist, the series has not run** |
| 7 | report states numbers, model, versions, limitations, and any result where Prosci did not help | met, including the route that was not named |

Criterion 6 is why this is not complete.
