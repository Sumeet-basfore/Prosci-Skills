# Network-access inventory

Prosci ships skills, a handful of local scripts, and nothing else. This file lists every network path in
what it installs, so the claim can be checked instead of believed.

## Policy: zero product telemetry

- No analytics, no tracking identifiers, no device or credential fingerprints, no accounts, no background
  reporting, no update pings.
- No network request is made by any code Prosci installs or runs.
- Evaluation records, transcripts and evidence stay on the machine that ran them. Nothing is uploaded.

## Inventory

| component | network access | notes |
| --- | --- | --- |
| `skills/prosci*` (17) | none | Markdown instructions; no executable content |
| `bin/context-doctor` | none | Reads files and runs local commands |
| `bin/verify` | none | Runs the repo's own commands |
| `bin/install-gate` | none | Writes a workflow file |
| `bin/install-skills` | none | Copies or links directories |
| `bin/lib/factory-block.mjs` | none | Pure parser |
| `eval/harness/*` | localhost only | `proxy.mjs` forwards to the provider; every other harness file is offline |

Exactly one file makes an outbound request: `eval/harness/proxy.mjs`. It is not installed, not run by a
skill, and exists only so that evaluation runs can hold the provider key outside the sandbox. It forwards
`POST /inference/go/` to `opencode.ai` and nothing else.

## What Prosci does not control

The coding harness and the model provider see the conversation, the files you point them at, and the
commands they run. That is their data flow, not Prosci's. Prosci adds no channel of its own: no phone
home, no badge, no usage counter, no version check.

If you install Prosci through a package registry, that registry sees the install, exactly as it would for
any package. Prosci itself does not.

## Verification

```sh
node eval/harness/audit-network.mjs
```

Scans `skills/` and `bin/` for `fetch`, `http.request`, `net.connect`, `dns`, `XMLHttpRequest` and
telemetry vendor names, with one documented exception (`eval/harness/proxy.mjs`). It exits non-zero with
the offending file and line pattern. CI runs it on every pull request, so a skill cannot quietly add a
request.

## Limits of this check

- It is a static scan. A request assembled by string concatenation or hidden in a binary would evade it.
- It does not inspect the harness or the provider; see "What Prosci does not control".
- It says nothing about a skill instructing a model to fetch a URL. That would be visible in review, and
  none does today; the check is a floor, not a proof.
