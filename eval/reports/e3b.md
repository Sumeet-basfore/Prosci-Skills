# E3b — Budget-aware multi-model execution (one valid arm, one invalid arm)

Date: 2026-11-26. Authorization: user message m02057. Model prices are catalogue rates, not an invoice.

## What was authorized

Two swarm executions of the same three-unit plan, identical fixture, skills, acceptance and isolation:

| Arm | Architect | Implementer | Reviewer |
|---|---|---|---|
| economy | claude-haiku-5-5 | claude-haiku-5-5 | claude-haiku-5-5 |
| mixed | minimax-m3 | claude-haiku-5-5 | minimax-m3 |

Limits per arm: 24 proxy-enforced requests, 1 retry per unit, concurrency 2, 20-minute global deadline, 10-minute unit deadline, estimated monetary ceiling $0.02. Proxy allowlist `claude-haiku-5-5,minimax-m3`. Separate single-use authorization records bound to each plan hash. No rerun without approval.

Plans: `eval/scenarios/e3b/plan-economy.json` (hash `845e1e012596ddc1`), `plan-mixed.json` (hash `01a3b1905a9330fc`). They differ only in `profile`. Both pass `bin/prosci-swarm check`.

Fixture: `eval/fixtures/e3b-stats` — `median()` throws, two tests pin odd and even behaviour, and `tools/check-review.mjs` rejects a review that copies the ADR or does not cite a real `src/stats.mjs` line.

## Isolation (fresh, model-free)

Evidence: `eval/reports/e3b/isolation.txt`.

- `sandbox.sh --verify` passes: probe beside the workspace, host `AGENTS.md`, SSH key and host Pi credentials are unreachable; no credential-shaped environment variables; own PID namespace.
- Readability probes all `absent`: `~/.ssh`, `~/.aws/credentials`, `~/.codex/auth.json`, `~/.config/gh/hosts.yml`, `~/.netrc`, host Pi `auth.json`/`models.json`, repo `AGENTS.md`, the E3b plan file, `projects/forge`, `/home/sumeet/real-auth-probe`.
- One harness defect was fixed before running: the built-in probe lived at `$HOME_DIR/../real-auth-probe`, which is inside a bound workspace and therefore always readable. It now sits beside the workspace (`$(dirname "$WORKSPACE")/real-auth-probe`). This was a false alarm, not a leak.

## Acceptance anti-vacuity

Evidence: `eval/reports/e3b/vacuity.txt`.

| State | Suite | Behaviour |
|---|---|---|
| Untouched fixture | exit 1 | exit 1 |
| Implemented median (odd 3, even 2.5) | exit 0 | exit 0 |

`check-review.mjs` accepts a real review that cites `src/stats.mjs:1` and rejects a byte copy of the ADR with `review is a copy of the architecture artifact`.

## Economy arm — valid

Plan hash `845e1e012596ddc1`, one single-use execution, base git commit `d957da3` (untouched fixture).

Result: **3 succeeded, 0 failed, 0 blocked, 0 cancelled**, 17/24 requests reserved, all HTTP 200. Authorization record: `executions 1`, `maxRetriesPerUnit 1`, `requestsUsed 17`, `maxRequests 24`.

| Unit | Requested model | Reported identity | Transitions | Duration | Tokens (in/out/cacheR/cacheW) |
|---|---|---|---|---|---|
| u1-architect | haiku-5-5 | `prosci-proxy-anthropic/claude-haiku-5-5` | seq 1–3 | 23,382 ms | 2/504/9,417/199 |
| u2-implement | haiku-5-5 | `prosci-proxy-anthropic/claude-haiku-5-5` | seq 4–6 | 14,809 ms | 2/608/7,667/274 |
| u3-review | haiku-5-5 | `prosci-proxy-anthropic/claude-haiku-5-5` | seq 7–9 | 19,198 ms | 2/463/12,910/365 |

Wall-clock epoch window 1795633850655 → 1795633909661; monotonic 51,671,106 → 51,730,112 ms. Sequence windows are preserved alongside, as designed.

Artifacts and propagation:
- `u1` wrote `docs/adr/0001-median.md` only: context, forces table, options A (copy/sort/index) and B (quickselect), decision A with reasons, consequences, reversal cost, open items. It did not implement.
- `u2` started from `u1`'s commit (`c5c149f4`) and changed `src/stats.mjs` only. Implementation is three lines: copy, numeric sort, middle or mean.
- `u3` started from both predecessor commits (`c5c149f4`, `426a7005`) and changed `docs/review.md` only.

Independent review: verdict **pass**; cites `src/stats.mjs:2` (copy, numeric comparator) and `:3-5` (odd/even), with two non-blocking findings (`:5` implicit `NaN` from `undefined + undefined`, `:2` string coercion). It states what was not checked. The unit's acceptance command (`node tools/check-review.mjs docs/review.md docs/adr/0001-median.md`) passed, and the integrated tree passed `node --test`.

Skill loading: `u1` and `u2` read none of their assigned skill bodies (bash/write only). `u3` read `agent/skills/prosci-review/SKILL.md`. All 17 skills appear in the system prompt's discovery list; discovery is not loading. Adherence: all three produced an artifact matching the requested shape; only the reviewer explicitly loaded its skill.

Ownership, failures, retries, termination: 0 ownership violations, 0 failures, 0 retries, all process groups ended, nothing survived the sandbox.

Cost: catalogue rates (input $0.10, output $0.50, cache read $0.01, cache write $0.125 per Mtok) give **$0.001193 estimated**. Provider-reported cost is 0 because the custom provider carries no price metadata, so this is arithmetic, not billing.

## Mixed arm — invalid for comparison

Intended plan hash `01a3b1905a9330fc`. It did not run under its own authorization.

Two independent failures:

1. **Proxy process reuse.** The stop command captured the PID of a wrapper rather than the node proxy. The economy proxy (pid 2502984, port 4321) kept running; the mixed proxy died with `listen EADDRINUSE`. Mixed requests were therefore served by the economy proxy and charged to the economy budget: `out/economy/request-budget.json` ended at `used: 24` (24 × 200, then 16 × 429), while `out/mixed/request-budget.json` stayed at `used: 0`. The mixed ledger's `requests 0/24` and `requestsUsed 0` are therefore not measurements of its traffic.
2. **Dirty base.** After the economy run the shared repo was left checked out on `prosci/e3b-stats/845e1e/integration/u3-review`. The controller takes `base = git rev-parse HEAD` at start, so the mixed run began on economy's integrated commits. Mixed `u1`'s log contains economy integrations `210ad92`/`db19b6e`; `u2` passed because the implementation already existed, not because it implemented it.

Observed (not usable as a fair arm): `u1` minimax-m3 produced a substantive ADR and read `agent/skills/prosci-architect/SKILL.md`; `u2` haiku-5-5 succeeded on the pre-populated tree; `u3` minimax-m3 failed acceptance on both attempts with `ENOENT ... docs/review.md` after HTTP 429s and no `write` call. Its usage fields arrived as 0. No conclusion about model capability or profile quality follows from any of this.

The invalid arm is preserved rather than deleted: `eval/reports/e3b/mixed/` (ledger, auth, budget, raw JSONL, ADR, stats.mjs, proxy log). There is no mixed `proxy-access.jsonl` because that proxy never started.

## Did budget profiles produce distinct assignments?

Mechanically, yes: the mixed profile resolved to minimax-m3 for architect and reviewer and haiku-5-5 for implementer, and the CLI reported those identities. But only the economy arm executed under its own authorization on a clean base, so the experiment does not establish that the mixed profile executes correctly end-to-end. That question remains open and requires a fresh authorization.

## Defects found, then fixed

- **D-005 — proxy lifecycle.** A second proxy on an occupied port failed into a log while the first kept serving, and the controller trusted its own budget file. Fixed: `proxy.mjs` exits 2 on bind failure; `proxyctl.mjs` refuses an occupied port, verifies `/__identity` before returning, records the real pid, and on stop kills the process group and waits until the process and port are gone. The harness asks `/__identity` and records it; the controller reads that file before claiming an authorization and refuses a proxy whose execution id or plan hash differs. (The run below used the equivalent in-controller check; it moved behind the harness file after `audit-network` correctly flagged `fetch` in shipped code.)
- **D-006 — base and checkout leak.** `base = HEAD` inherited a previous run's integration branch. Fixed: plans bind `baseCommit` and `fixtureHash`; `inspectArm` rejects a different HEAD, a dirty tree, leftover run branches and a changed fixture fingerprint; the controller restores the base on exit. Paid runs require both fields.
- **D-007 — request evidence.** Fixed: each access-log line carries `executionId`, `planHash`, `model`, `endpoint`, `reserved`, `status`, `budgetUsed` and `at`. Request headers, including the credential, are never logged.

Regression coverage: `bin/test/exec-guard.test.mjs` (tree acceptance, HEAD/dirty/branch/fingerprint refusals, restore), `bin/test/swarm-run.test.mjs` (wrong base, dirty tree before authorization, foreign proxy), `eval/harness/test/proxy-lifecycle.test.mjs` (occupied port, two live proxies, separate budgets, identity mismatch, real stop, non-proxy listener).

## E3b-2 — one fresh mixed execution after the corrections

Authorization: user message m02232, one execution, 24 requests, 1 retry, concurrency 2, 20/10-minute deadlines, $0.02 advisory ceiling.

Binding: fresh repo `4a9002f13bbf5461ae362b6b2bf081a0d9c5e633`, fixture fingerprint `7577214f67499f9b`, plan hash `2391b7dc75adc2db`, execution id `e3b-mixed-2`, proxy port 4322. Evidence: `eval/reports/e3b2/`.

Pre-run checks (all model-free):
- `sandbox.sh --verify` passes; every readability probe ABSENT (credentials, host Pi config, repo `AGENTS.md`, the plan file, `projects/forge`, the planted probe).
- Clean arm inspection `{ok:true, head:4a9002f…, fingerprint:7577…}`. Adding one line to `src/stats.mjs` produced `ok:false` with both `working tree is not clean` and a changed fingerprint.
- Fresh-copy anti-vacuity: untouched suite exit 1, behaviour exit 1; implemented exit 0; a real review accepted; a copied ADR rejected.

Result: **2 succeeded, 1 failed; 24/24 requests reserved; 28 access-log lines (24 × 200, 4 × 429); base restored to `4a9002f`.**

| Unit | Requested | Reported | Duration | Requests (successful) | Estimated $ |
|---|---|---|---|---|---|
| u1-architect | minimax-m3 | `prosci-proxy-anthropic/minimax-m3` | 54,339 ms | 9 | 0.009141 |
| u2-implement | claude-haiku-5-5 | `prosci-proxy-anthropic/claude-haiku-5-5` | 13,980 ms | 8 | 0.002183 |
| u3-review | minimax-m3 | `prosci-proxy-anthropic/minimax-m3` | 28,585 ms | 7, then 429s | 0.007087 |

- Artifact propagation: u1 wrote `docs/adr/0001-median.md` (accepted; options A copy/sort and B caller-pre-sorts, decision, reversal cost). u2 started from u1's `5fde9362`, changed only `src/stats.mjs`; the integrated tree passes `node --test`. u3 started from `5fde9362` and `23a602c6`, read `prosci-review`, and produced no `docs/review.md` before the budget ran out.
- u3 acceptance failed (`node tools/check-review.mjs docs/review.md docs/adr/0001-median.md`), the authorized retry consumed no request because the controller refused to spawn it at 24/24, and the unit is recorded `failed — request budget exhausted (24/24)`.
- Skill loading: u1 read `prosci-architect`, u2 read no assigned skill, u3 read `prosci-review`. Its review still did not land before the cap, so reading the skill is not adherence.
- Ownership: no violations. Processes: all process groups ended; proxy stopped with `{processAlive:false, portOpen:false}`; port 4322 refuses connections.
- Cost: **$0.01841 estimated** from catalogue rates over every request's usage; provider-reported cost is 0, so this is not billing. It is under the advisory $0.02, but the binding limit was the 24-request cap.

What this shows: the mixed profile's model assignments were applied exactly, and the arm executed on the authorized snapshot against its own proxy. It did not complete the plan. The reviewer needs more than the zero requests left after architect + implementer, so the request cap — not model capability — decided the outcome. No quality comparison with the economy arm is made.

## Product limitation: assigned skills are not injected

The controller passes `--skill <path>` to Pi, which registers the skill for discovery but does not put its body in the worker's instructions. Across all four E3b arms, only 3 of 9 unit runs opened their assigned `SKILL.md` (u1 mixed, u3 mixed, u3 economy). A worker can therefore satisfy acceptance while ignoring the procedure the plan assigned it. Proposed, not implemented: `prosci-swarm-run` should read each assigned skill and prepend its body (or a bounded excerpt) to the handoff prompt, so adherence does not depend on the model choosing to open a file it was already told about. This belongs in its own change with an eval that distinguishes injected vs discovered.

## Cost and limits

- Estimated spend: **$0.001193** (economy) + unknown for mixed (usage 0, 7 of its requests were forwarded on the economy proxy before the cap, 16 denied). Well under the $0.04 combined ceiling in requests and in estimated money; this is not an invoice.
- No rerun was performed. Both arms remain single-execution evidence.
- Feature freeze held: no skill edits, no new agent roles, no infrastructure expansion, E1/E4/public release untouched.

## Files

- `eval/reports/e3b/isolation.txt`, `vacuity.txt`
- `eval/reports/e3b/economy/{ledger.json,auth.json,request-budget.json,proxy-access.jsonl,proxy.log,artifacts/,raw/}`
- `eval/reports/e3b/mixed/{ledger.json,auth.json,request-budget.json,proxy.log,artifacts/,raw/}`
- `eval/reports/e3b2/{isolation.txt,vacuity.txt,mixed/…}` — corrected-arm evidence
- `eval/harness/{proxyctl.mjs,proxy-identity.mjs}`, `bin/lib/exec-guard.mjs` + their tests
- Code/config: `agents/budgets.json` (`mixed` profile), `bin/prosci-swarm-run` (per-unit wall+monotonic timestamps, raw output capture), `eval/harness/sandbox.sh` (probe path), `eval/harness/proxy.mjs` (`PROXY_MODELS` allowlist), `eval/fixtures/e3b-stats/`, `eval/scenarios/e3b/`.
