# Phase B specification — project intelligence

**Status:** proposal for approval. Nothing here is implemented. No swarm, no adapters, no new skills.

Reads: `eval/reports/phase-a.md` §7. That result shapes this spec: knowledge that is not delivered at the
point of use is inert, so Phase B is about producing and using *facts*, then validating them.

---

## 1. What Phase B adds

1. `bin/prosci-survey` — one deterministic script that reports what a repo is, without a model.
2. `prosci-init` becomes a setup workflow that consumes the survey, recommends a configuration, gets approval,
   writes the minimum, and validates the result.
3. `docs/plan`-level **model metadata** file: explicit, inspectable tiers. No credential reads.

## 2. Survey: the contract

```json
{
  "schema": 1,
  "root": "/path",
  "vcs": { "git": true, "branch": "main", "dirty": false, "remote": "origin" },
  "stacks": ["node", "python"],
  "manifests": ["package.json", "pyproject.toml"],
  "commands": {
    "test": { "command": "node --test", "source": "AGENTS.md", "verified": true, "exit": 0 },
    "build": { "command": null, "source": null },
    "typecheck": { "command": null }
  },
  "tests": { "frameworks": ["node:test"], "files": 12, "hasNoTests": false },
  "ci": [".github/workflows/ci.yml"],
  "instructions": ["AGENTS.md", "CLAUDE.md"],
  "harnesses": { "pi": { "skillsDir": "~/.agents/skills", "present": true } },
  "models": { "configPath": "~/.pi/agent/models.json", "providerCount": 3, "reportsCost": false },
  "secrets": { "envFiles": [".env.example"], "gitignored": [".env"] },
  "risks": [
    { "code": "no-test-command", "severity": "high", "detail": "no test command found in instructions, manifest or CI" },
    { "code": "dirty-tree", "severity": "low" }
  ],
  "skills": { "installed": 17, "recommended": ["prosci", "prosci-ship", "prosci-fix"] }
}
```

Rules:

- **Fact only.** No scores, no opinions, no model. Every field has a `source`: file path, command, or
  `"heuristic"` where it is a guess, and `verified` where a command was actually run.
- **Read-only.** Survey never writes, never installs, never runs a mutating command. Commands are *detected*
  from instruction files, CI and manifests; they are only *executed* in `--verify` mode, which the setup step
  asks for explicitly.
- **No credential reads.** Model metadata comes from the provider list and model ids in `models.json`, and
  from an explicit `docs/model-tiers.json` maintained by a person. `auth.json` is never opened, and no field
  is derived from a key, token or account id.
- **Bounded.** Skips `node_modules`, `.git`, build output, and any path over a size limit; a 2 GB monorepo
  must not take minutes.

## 3. Init workflow

```
survey --verify?  →  recommend  →  approval gate  →  write minimum  →  validate  →  report
```

1. **Survey** the repo (read-only). If a test command exists but cannot run, that is the first finding.
2. **Recommend** from a fixed rule table, not free-form: which skills apply (by risk codes), which agent roles
   (implementer/reviewer/verifier), a budget profile, and the instruction block to add.
3. **Approval gate.** Show the diff that would be written. Write only after a human says yes. No `--yes`.
4. **Write the minimum:** `AGENTS.md` block with the verified commands, and nothing else. Never overwrite; if
   the file exists, propose a patch, not a replacement.
5. **Validate:** run the recommended commands from a clean state, then `prosci-verify` on one real surface if
   the repo has one. Report exit codes.
6. **Report** what was written, what was skipped, and what remains unknown.

Boundary with `prosci-understand`: survey produces machine facts; understand produces the human model and
persists conventions. Init composes both, and the non-triggers say so in each file.

## 4. Model tiers, explicitly

`docs/model-tiers.json`, human-maintained:

```json
{
  "schema": 1,
  "tiers": {
    "economy":  { "roles": { "implementer": ["<model-id>"], "reviewer": ["<model-id>"] } },
    "balanced": { "roles": { "implementer": ["<model-id>"], "reviewer": ["<model-id>"] } },
    "quality":  { "roles": { "implementer": ["<model-id>"], "reviewer": ["<model-id>"] } }
  },
  "evidence": "how each model was chosen: measured, documented, or untested"
}
```

- No capability inference from names. A model with no evidence is labelled `untested`.
- Cost is an optional field with its source (`provider`, `estimate`, `unknown`); a tier never claims a dollar
  cap the harness cannot enforce (see `docs/release-conditions.md`).
- Swarm/planning reads this file; nothing reads credentials.

## 5. Validation, deterministic first

| check | type |
| --- | --- |
| survey schema validity and fact/source pairing | deterministic |
| survey accuracy on 5 labelled repos (stack, test command, CI, dirty, risks) | deterministic |
| no credential field in survey output (`grep` for key/token/secret patterns) | deterministic |
| survey is read-only: repo hash unchanged after a run | deterministic |
| init approval gate: refuses to write without approval; proposes a patch when the file exists | deterministic |
| model-tier file schema; no model without an `evidence` label | deterministic |
| command verification: recommended commands run and exit 0 on a clean fixture | deterministic |

Paid work is limited to one end-to-end run of init on a real repo, after approval.

## 6. Non-goals

No swarm execution, no agent spawning, no adapters, no new standalone skills, no browser, no daemon. Survey is
a script, init is a skill, tiers are a file.
