# Phase 0.2 — Entry-point architecture and calibration

**Date:** 2026-11-25
**Model:** `anthropic/claude-haiku-5-5`, thinking `low`, every run.
**Provider path:** sandboxed runs use a localhost proxy that holds the provider key outside the
boundary; the CLI sees a dummy token. Not identical to Phase 0.1's direct provider, which is why a
passive control arm is included.
**Skills:** passed explicitly with `--skill` from a scoped copy (9 skills). Fingerprint of that copy is
recorded per series.
**Spend:** $0.0626 of the $0.15 cap. 87 runs of the 108 allowed.
**Status:** milestone complete. The activation threshold was **not** met. No Phase 1 work started.

---

## 1. Architecture selected, and the result that changed it

Approved shape: `entry → router → route → bar`, progressive loading, individually callable skills.

Measured, that shape is not what the evidence supports. The router hop adds nothing measurable, and one
variant without it does as well or better:

| condition (15 runs each) | router read | route read | correct route | unnecessary | adherence | acceptance | tokens | spend |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| passive control | 0 | 5 | 5 | 0 | 15/15 | 15/15 | 94,422 | $0.0086 |
| repo `AGENTS.md` line → router | 9 | 11 | 11 | 0 | 14/15 | 15/15 | 143,871 | $0.0118 |
| user-message prefix → router | 12 | 10 | 10 | 0 | 13/15 | 15/15 | 152,561 | $0.0126 |
| system prompt → router | 9 | 7 | 7 | 0 | 15/15 | 15/15 | 128,218 | $0.0106 |
| `AGENTS.md` line → matching skill, **no router** | 0 | 11 | 11 | 0 | 15/15 | 15/15 | 108,829 | $0.0104 |

The last row is the finding. Same 11 of 15 as the best router variant, with fewer tokens, no second
hop, and every acceptance check passing. Per scenario it also covers `act-explain` completely (3/3)
where the router variants manage 2/3.

**Selected architecture:** entry instruction → the single matching skill, loaded on demand. The router
stays as an optional index for a user who wants to see the whole factory, and is not on the delivery
path. `prosci-bar` remains a closing step of a route, unchanged. No hiding, no daemon, no runtime.

This is a change to the approved shape and it is why the milestone reports a negative: the approved
`entry → router → route` sequence did not clear the threshold, and the simpler sequence did not either,
but it is cheaper and no worse. Whether that is adopted is a review decision, not mine to take silently.

## 2. Threshold

Pre-registered: **12 of 15** runs load the correct route. Best measured: **11 of 15** (discovery arm and
no-router arm). Not met. 73% with a wide interval at n=15.

Stop rule applied: best result was below 12 and at or above 9, so the wording experiment and the
progressive-loading experiment ran, and the dispatcher did not. No dispatcher was built.

## 3. What the artifacts said about the slash failure, and what was wrong with it

Phase 0.1's three arms were not comparable the way they looked. Reading the stored JSONL:

- **S2 `/skill:`** inlined the body into the user message. No run in 15 attempted a `../prosci-*/SKILL.md`
  read at all, so "relative paths failed" was never the mechanism; the instruction produced no action.
- **S3** (repo line) produced a tool read of the router and then a route read in 7 of 10 router reads.
- **S4** (system prompt) produced 9 router reads and 3 route reads.

Phase 0.2 fixed a confound that Phase 0.1 could not see: those runs inherited
`PI_CODING_AGENT_DIR=/home/sumeet/.pi/agent`, so they used the real agent directory and a real skill
list of 2,206 entries. With a genuinely scoped directory and 9 skills named explicitly, the same
passive condition that scored 0 of 15 in Phase 0.1 scores 5 of 15 now, all directly to a route without
the router. **Fewer, well-described skills are themselves an activation lever**, and Phase 0.1's "0 of
18" was partly a property of a 2,206-skill list, not only of the mechanisms tested.

That is a correction to the previous conclusion, not a victory: 5 of 15 is still unreliable, and the
passive arm skipped the router entirely.

## 4. Downstream loading, adherence, correctness — kept separate

Per scenario, route loads out of 3:

| scenario | passive | AGENTS.md → router | prefix → router | system → router | AGENTS.md → direct |
| --- | --- | --- | --- | --- | --- |
| `act-broken-test` | 3 | 3 | 2 | 3 | 3 |
| `act-add-helper` | 2 | 3 | 3 | 2 | 3 |
| `act-doc-drift` | 0 | 3 | 3 | 2 | 2 |
| `act-explain` | 0 | 2 | 2 | 0 | 3 |
| `act-neg-*` (must not) | 0 | 0 | 0 | 0 | 0 |

- **Activation ≠ loading ≠ adherence.** Nothing in the negative scenario activated in any arm, so no
  false positives. Adherence checks (test-before-edit, report-the-drift) failed twice in the prefix arm, once in
  the `AGENTS.md` arm, and never in the direct arm — with acceptance at 15/15 everywhere, the tasks remain too
  easy for acceptance to separate the arms.
- **Correctness did not discriminate.** All 15 of 15 acceptance checks passed in every arm. The tasks
  measure whether a route was used, not whether engineering quality improved. That limitation is
  unchanged from Phase 0.1 and is the reason for the calibration work below.

## 5. Token overhead

Per run, 15-run series: passive 6,294 tokens; router arms 8,547–10,170; direct arm 7,255. The router hop
costs roughly 20–40% more tokens than going to the skill directly, and the highest-loading arm (prefix,
12/15 router reads) also produced the fewest route loads per token. Progressive loading is cheap; the
extra hop is the expensive part.

## 6. Isolation: what is guaranteed

Implemented and verified before every series (`eval/harness/sandbox.sh --verify`):

| property | mechanism | negative test |
| --- | --- | --- |
| filesystem | `bwrap` with only `/usr`,`/bin`,`/lib`,`/lib64`,`/etc`, the pi package, the fixture, the run home | `~/.ssh/id_ed25519`, real `auth.json`, this repo's `AGENTS.md`, and a synthetic probe outside the boundary are all unreadable |
| environment | `--clearenv`, explicit `PATH`, `HOME`, `PI_CODING_AGENT_DIR`, `TMPDIR` | no `*KEY*|*TOKEN*|*SECRET*` variables present |
| process | `--unshare-pid`, `--unshare-ipc`, `--unshare-uts`, `--die-with-parent` | the sandbox has its own pid 1 |
| credentials | localhost proxy outside the boundary holds the key, forwards only `/inference/go/`; the CLI gets a dummy token | reading the dummy token buys nothing; the real key is absent from filesystem and environment |

Historical claims are corrected in `eval/reports/isolation-errata.md` without touching the original
measurements. The important correction: `PI_CODING_AGENT_DIR` was exported in the harness shell, so
Phase 0 and 0.1 used the real credential store and the real agent directory, and the audit measured a
file nothing read.

**Remaining limitation, stated plainly:** the dummy token is readable by a model-controlled shell. The
guarantee is that it is worthless outside the proxy, and that only one inference path is forwarded. If
the proxy rule widens or a real key returns to the sandbox environment, the guarantee lapses silently —
the negative tests are the gate, not the design document.

## 7. Calibration

Four tasks taken from real work in this repo, in `eval/scenarios/calibrated/`, each with a reference fix
and an independent acceptance run by the harness:

| task | vanilla (no skills), 3 runs | verdict |
| --- | --- | --- |
| `cal-missing-skills-dir` — installer crashes on a missing directory | 0/3 pass | **kept** |
| `cal-version-flag` — no way to ask a tool its own version | 0/3 pass | **kept** |
| `cal-test-gap` — add a test for an unknown key | 3/3 pass | excluded, at ceiling |
| `cal-docs-flags` — document three flags | 2/3 pass | excluded, at ceiling |

The two kept tasks are the calibration set. The two excluded ones are recorded with their outcomes, not
deleted. None was edited to make vanilla fail, and the selection criterion was fixed before the runs.

**Do not read this as superiority.** These tasks were selected *because* vanilla fails them. They are a
discriminating set for this model at this effort, nothing more.

## 8. Costs

| series | runs | spend |
| --- | --- | --- |
| E1 passive control | 15 | $0.0086 |
| E1 repo line | 15 | $0.0118 |
| E1 user prefix | 15 | $0.0126 |
| E1 system prompt | 15 | $0.0106 |
| E3 direct route, no router | 15 | $0.0104 |
| E5 calibration, vanilla | 12 | $0.0086 |
| **total** | **87** | **$0.0626** |

Cap was $0.15 and 108 runs. Wording (E2) was not run as a separate experiment: `act-explain` activated
2/3 with the default line in two arms and 3/3 in the direct arm, so the earlier 0/15 was the skill-list
confound, not the wording. That is recorded as answered-by-data rather than as a skipped experiment with
unknown cost. Prices for the proxied model are a conservative table in the harness, not the provider's
invoice; token counts are measured.

## 9. Unresolved limitations

1. **73% is not reliability.** Eleven of fifteen runs is a coin flip with a thumb on the scale. No
   mechanism tested delivers the instruction every time.
2. **Acceptance still cannot separate the arms.** Every arm scored 15/15. The calibrated tasks are
   designed to fix that but were validated, not yet run against both configurations.
3. **One model, one effort, n=15.** No claim about a stronger model; none was tested.
4. **Interactive use is unmeasured.** All of this is `-p` print mode. A session where a user types the
   entry point is a different observation.
5. **The dummy token is reachable** inside the sandbox. See §6.

## 10. Implications for Phase 1

The evidence does **not** support starting Phase 1 on the strength of activation. It supports, in order:

1. **Decide the entry point.** The measured options are a repo instruction line to the matching skill
   (11/15, cheapest), or an explicit slash invocation, which was not re-measured in this phase. The
   router is optional either way.
2. **Ship the limitation with the workflow.** "Prosci is an explicitly invoked mode. Passive discovery
   works about seven times in ten and sometimes picks a leaf skill directly."
3. **Phase 1 skills must be worth invoking, not discoverable.** Since loading is unreliable, a skill's
   value has to come from being called deliberately; designing for passive discovery is measuring the
   wrong thing.

No new skills, no hiding, no daemon, no runtime, no per-harness generator, and no stronger model were
introduced in this phase. Phase 1 has not started and should not until these results are reviewed.
