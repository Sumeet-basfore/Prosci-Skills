# Running evaluations without exposing this machine

The evaluation harness runs a model with a shell. That combination needs a boundary, not a policy the
model could argue with. This file states what the boundary is, what it does not cover, and how to check
it.

## Check it before trusting it

```sh
eval/harness/sandbox.sh --verify <workspace> <home> <agent-dir>
```

Exits non-zero if any negative test fails. The harness runs this before a series and refuses to start.
A check that is not run is not a guarantee.

## What is inside the boundary

- `bwrap` with `--clearenv`, its own pid, ipc and uts namespaces, and `--die-with-parent`.
- Mounted read-only: `/usr`, `/bin`, `/lib`, `/lib64`, `/etc`, the pi package.
- Mounted writable: the fixture and the run's `HOME`.
- Absent, not merely unreadable: `~/.ssh`, the real `~/.pi`, this repository, every other project.

## Credentials

The provider key never enters the sandbox. `eval/harness/proxy.mjs` runs outside it, holds the key, and
forwards only:

- `POST` requests,
- under `/inference/go/`,
- for the models named in `PROXY_MODELS` (default: `claude-haiku-5-5`),
- up to `PROXY_MAX_REQUESTS` requests per series (default 200),
- with bodies under 2 MB.

The sandboxed CLI gets `sandbox-dummy-token`, which is worth nothing anywhere else.

## What this does not cover

1. **The dummy token is readable by a model-controlled shell.** That is by design and is why the proxy
   exists. Any widened proxy rule, or a real key placed back in the sandbox environment, silently
   removes the guarantee.
2. **Network egress is open.** The proxy needs it. A run that exfiltrated something would need
   somewhere to send it; the boundary does not prevent egress, it prevents access.
3. **The proxy is not authenticated.** Any process on this machine that learns the port and the model
   name can spend through it. The port is random per series and the process dies with the harness, but
   this is loopback trust, not authentication.
4. **Only `bwrap` was validated here.** On a machine without it, `sandbox.sh` fails closed rather than
   falling back to an unsandboxed run.

## Historical correction

Phase 0 and 0.1 inherited `PI_CODING_AGENT_DIR` from the harness shell, so they used the real agent
directory and credential store while the report described a throwaway HOME. Details and the fix:
`eval/reports/isolation-errata.md`. The original measurements were not rewritten.
