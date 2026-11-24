# Errata: isolation claims in Phase 0 and 0.1

The original measurements are unchanged. What was wrong was the description of what protected them.

## What was claimed

`phase-0.md` said credential isolation held because the runner copied `auth.json` into a throwaway
HOME and deleted it with the directory. `phase-0.1.md` then found that an empty temp HOME still
authenticated and corrected the claim to "Pi resolves the credential store from somewhere other than
`$HOME`", leaving the cause unknown.

## What was true

`PI_CODING_AGENT_DIR=/home/sumeet/.pi/agent` is exported in the shell that ran the harness, and Pi's
`getAgentDir()` prefers it over `$HOME`. Every run in Phase 0 and 0.1 therefore read the real
credential store and the real agent directory. The temp-HOME copy was never consulted.

Proven by pointing the variable at an empty directory: authentication fails, zero tokens, the
directory stays empty (`docs/plan/phase-0.2-spec.md` §3).

Consequences that matter beyond credentials:

1. **The audit check was measuring an unused file.** "0 commands touching `auth.json`" was true and
   irrelevant.
2. **Skills came from the real agent directory.** The "isolated 13,124-token session" was isolated in
   workspace and in the skill *list*, not in the agent configuration.
3. **A model-controlled shell could read that store.** Nothing in the sandbox model prevented it.

## What changed in Phase 0.2

- `HOME` and `PI_CODING_AGENT_DIR` are both scoped to the run directory.
- The run executes inside `bwrap` with `--clearenv`: only `/usr`, `/bin`, `/lib`, `/lib64`, `/etc`, the
  pi package, the fixture and the run home are mounted. `~/.ssh`, the real `~/.pi`, this repo and every
  other project are absent, not merely unreadable by policy.
- The real provider key never enters the boundary. A localhost proxy outside the sandbox holds it and
  forwards only `/inference/go/`; the sandboxed CLI gets a dummy token.
- Negative tests run before a series and abort it: `~/.ssh/id_ed25519`, the real `auth.json`, this
  repo's `AGENTS.md` and a synthetic probe file outside the boundary must all be unreadable, and `env`
  must contain no credential-shaped variables (`eval/harness/sandbox.sh --verify`).

## What is still true and should not be overclaimed

The dummy token is readable by a model-controlled shell inside the sandbox. It is worth nothing
outside: the proxy is the only component holding the real key, and it permits one path. If the proxy is
ever started with a broader rule, or the key is placed in the sandbox environment again, this guarantee
lapses silently — which is why the negative tests are the gate rather than a checklist.

Phase 0 and 0.1 comparisons to Phase 0.2 are indicative, not exact: the provider path changed (a
different base URL and a dummy token), and the skill set is passed explicitly instead of being
discovered. Phase 0.2 carries a passive control arm for that reason.
