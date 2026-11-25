# Phase 4 and public-release readiness — proposal

**Status:** for review. Nothing here is implemented; Phase 4 is not started.
**Inputs:** `eval/reports/phase-0.1.md` … `phase-3.md`, `docs/security.md`, `docs/network-inventory.md`.
**Spend so far:** $0.22 across all phases. No Phase 4 runs are authorized by this document.

---

## 1. What the evidence says, and what it does not

Seventeen skills exist. What is measured:

- **Reachability.** With the direct-entry instruction, the right route loads most of the time in small
  fixtures: 11/15 at the 9-skill stage, 20/24 at 12, 9/9 and 6/6 in Phase 2/3 smoke samples. Not a
  reliability claim: n=3–15 per arm, synthetic tasks.
- **No interference.** 12 skills did not change outcomes on two calibrated tasks (0/6 both arms).
- **Boundary health.** 44 routing scenarios including 14 boundary pairs; the table's rows are tested
  against each other, not against a model.
- **Artifact quality.** Mostly unproven. Three assertions in three phases tested a phrasing rather than a
  property; one merge skill escalated a constraint violation in 3/3 runs.

What is not measured: any real repository, any real user, any throughput number, any maintenance effect.
That gap is the whole of Phase 4.

## 2. Phase 4 priorities

### 2.1 Real-repository trials, not more synthetic fixtures

Three repositories, chosen for different failure surfaces:

| repo | surface | why |
| --- | --- | --- |
| `prosci` itself | a repo the agent has partial knowledge of | measures self-application and doc drift |
| `forge` or `lore` | unfamiliar code with its own conventions | measures `understand` and `init` on real history |
| one small third-party repo | unknown conventions, no factory block | measures ingestion without our assumptions |

Each trial: a real issue from that repo's tracker, expressed as a user would. Record: route chosen, files
touched, time to first green, reviewer minutes, defects found after merge. Success is a merged result that
survives review, not a passing score.

Limit: 3 repos × 3 issues = 9 trials. No new fixtures. A trial that needs a fixture is not a trial.

### 2.2 Comparative effectiveness: frozen nine vs seventeen

The deferred 18-run Phase 2 series and the Phase 1 comparison both pointed the same way: no measurable
difference on synthetic tasks. Real tasks are where a difference would show, if it exists.

Design: the same 9 real issues, run with the frozen nine and with the seventeen, same model and sandbox.
18 runs, blind scoring by the repo's own tests plus one reviewer blind to the configuration. Cost
estimate at the measured rate: ≈ $0.02, plus reviewer time, which is the real cost.

Do not repeat this on synthetic tasks. It has been done twice and answered.

### 2.3 Installation, onboarding, explicit invocation

Measure the first ten minutes, not the theory:

- `bin/install-skills --check` and `--harness` on a clean machine: how many steps, which fail.
- A new user given only `README.md`: can they invoke a skill by name, and does it load? Time to first
  routed task.
- Explicit invocation vs the repo-instruction line: which do they choose, and does it work the second
  time, when the novelty is gone.

Deliverable: a five-step onboarding script and a short "explicitly invoked mode" doc that states the
11/15 limitation instead of implying discovery is solved.

### 2.4 Router ambiguity, unnecessary activation, context overhead

Already instrumented; needs real inputs:

- Run the 44 routing scenarios against 20 real issue titles from the three repos. Every disagreement is
  either a table defect or a scenario defect; record which.
- Count unnecessary activation on requests with no code change (questions, status, chat). Current
  evidence: 0/15 on the negative scenario, untested on real prose.
- Context overhead: measured 6.3k–10.2k tokens per run at 17 skills; re-measure on a repo with a large
  `AGENTS.md` and a real skill list, where the budget actually bites.

### 2.5 Verified delivery throughput, correctness, maintainability

The outcome numbers, not the process numbers:

| metric | how |
| --- | --- |
| throughput | issues closed per hour of agent + reviewer time |
| correctness | post-merge defects in the trial repos within 7 days |
| maintainability | diff size, files touched, tests added, whether the diff is reviewable in one pass |

A trial that produces a merged PR but a diff nobody can review counts as a failure of the factory, not a
success of the agent. Say so in the report.

### 2.6 Documentation and compatibility accuracy

Every claim in `README.md` becomes a check or is deleted:

- install commands: run on a clean container
- supported harnesses: the five in `install.mjs`, verified by the filesystem check, plus an honest
  "discovery not tested" line where it applies
- the 11/15 activation figure: present and attributed
- `docs/security.md`, `docs/network-inventory.md`: linked from the README, not buried

## 3. Privacy and trust: zero telemetry

Policy (proposed, and already true of the code):

1. No analytics, no tracking identifiers, no credential-derived fingerprints, no accounts, no background
   reporting, no update checks.
2. Evaluation records, transcripts and evidence are local. Nothing is uploaded; the run directories are
   gitignored and stay on the machine.
3. No network request from anything Prosci installs. Verification is automated, not asserted:
   `eval/harness/audit-network.mjs` scans `skills/` and `bin/` for network primitives and telemetry vendor
   names, and CI fails on a finding. Inventory: `docs/network-inventory.md`.
4. One documented outbound path exists — `eval/harness/proxy.mjs` — used only by evaluation runs to keep
   the provider key outside the sandbox. It is not installed and not invoked by any skill.
5. **Separation of responsibility.** The coding harness and the model provider see the conversation, the
   files, and the commands. That is their data flow, governed by their terms. Prosci adds no channel of
   its own. This distinction must appear in the README, not only here.
6. Optional integrations (a provider, a registry) are opt-in and named. No integration is enabled by
   default.

Gaps to close before release:

- The audit is a static scan; string-concatenated requests or binaries would evade it. State that limit
  next to the claim, as `docs/network-inventory.md` does.
- No check covers a skill *instructing* a model to fetch a URL. Add a review rule and a grep for URLs in
  skill bodies, with an allowlist of documentation links.
- Release artifacts (if ever published) must be reproducible and the checksum published alongside.

## 4. Release readiness checklist

Blocking:

- [ ] Three real-repo trials completed, each with a merged or explicitly rejected result.
- [ ] Comparative nine-vs-seventeen on real issues, reported with its limitations.
- [ ] Onboarding path measured on a clean machine; README claims converted to checks.
- [ ] Network audit and consent text in the README, not only in docs.
- [ ] No known criterion defect left unlabelled in any report.

Non-blocking but wanted:

- [ ] One external user completes a task with no help.
- [ ] Router ambiguity measured on real issue titles.
- [ ] A documented recovery path when a skill misfires (the user's escape hatch).

## 5. What Phase 4 will not do

- No held skills (`security`, `perf`, `incident`) and no expansion toward thirty or seventy. A skill is
  added only when a real trial shows a gap the current seventeen cannot cover.
- No new runtime, daemon, dispatcher or generator.
- No synthetic-fixture programme: fixtures remain regression tests, not evidence of capability.
- No telemetry, ever, including "anonymous usage statistics".

## 6. Cost and stop conditions

| item | runs | estimate |
| --- | --- | --- |
| comparative nine vs seventeen on real issues | 18 | ≈ $0.02 |
| activation and unnecessary-activation checks on real titles | 20 | ≈ $0.02 |
| real-repo trials | 9 | ≈ $0.10 (longer runs, real repos) |
| **total** | **47** | **≈ $0.15** |

Reviewer time is the larger cost and is not estimated here; it should be before authorizing.

Stop conditions: if the first three trials show no merged result, stop and fix the workflow rather than
running the remaining six. If the comparative run shows no difference on real tasks either, the claim
becomes "the skills are a workflow, not an accelerator" and the release notes must say that.
