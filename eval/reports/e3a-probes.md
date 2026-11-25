# E3a — second-model probes

Authorized: four model runs (two `claude-haiku-5-5`, two of one second model), $0.02 estimated
ceiling, aggregate request cap declared before execution. Evidence under
`eval/reports/e3a-probes/`; raw run directory `eval/runs/e3a-probes/`.

## Selecting the second model, from metadata only

`pi --list-models` shows what this machine can reach. The provider holding the only credential this
harness uses is `opencode-go`, and it offers 31 models; **Claude Sonnet 4.5 is not one of them**. It
appears only under the `opencode` and `anthropic` providers, neither of which has a credential here.
So "Sonnet 4.5 if available" resolves to *not available inside the approved boundary*, and it was
not substituted with an `opencode` model the harness cannot authenticate.

Candidates were compared on declared metadata (catalogue in the installed Pi package), not on name
or reputation:

| Model | API / path | Context | Reasoning | $/Mtok in·out | Cost for 2 tool probes (est.) |
|---|---|---|---|---|---|
| claude-haiku-5-5 | anthropic / proven | 1M | yes | 0.10 · 0.50 | ~$0.0001 |
| **minimax-m3** | anthropic / proven | 1M | yes | 0.30 · 1.20 | ~$0.0003 |
| glm-5.3 | openai / unproven path | 1M | yes | 1.40 · 4.40 | ~$0.014 |
| kimi-k3.1-pro | openai / unproven path | 1M | yes | 2.00 · 10.00 | ~$0.02 (ceiling) |
| grok-4.7 | openai-responses / unproven | 500K | yes | 2.00 · 6.00 | ~$0.015 |

Chosen: **`minimax-m3`**. Reasons, in order: a different vendor from the implementer (so review is
not the same model checking itself); reasoning declared; 1M context; and it speaks
`anthropic-messages`, the transport E2 already exercised end-to-end, so a failure would diagnose the
model rather than an untested proxy path. It also leaves the $0.02 ceiling intact with ~50× margin,
where `kimi-k3.1-pro` would consume the whole ceiling on two probes. This is a selection from
declared metadata. **No quality claim is made or implied.**

## What was verified

Four runs, sandboxed, isolated agent directory, dummy credential, real key only inside the proxy;
`PROXY_MODELS=claude-haiku-5-5,minimax-m3`; budget pre-created with `limit: 20`.

| Run | Requested identity | Reported identity | Tool call | Answer | Usage |
|---|---|---|---|---|---|
| haiku-1 | prosci-proxy-anthropic/claude-haiku-5-5 | same | `read` | `amber` | 2,263 tokens |
| haiku-2 | prosci-proxy-anthropic/claude-haiku-5-5 | same | `read` | `amber` | 2,263 tokens |
| minimax-1 | prosci-proxy-anthropic/minimax-m3 | same | `read` | `amber` | 1,665 tokens |
| minimax-2 | prosci-proxy-anthropic/minimax-m3 | same | `read` | `amber` | 1,665 tokens |

- **Availability and identity:** all four returned a final assistant message, and the reported
  `provider/model` equals the requested pair. No silent substitution.
- **Tools:** each run called the `read` tool on `data/probe.txt` and answered from its contents.
- **Usage:** each run reported token usage (input, output, cache read, cache write). Cache reads
  dominate: 2,196–2,257 of 2,263 tokens for haiku, 1,536 of 1,665 for minimax.
- **Allowlist:** a direct request naming `claude-sonnet-4-5` was refused `403` *before* reserving;
  the budget stayed at 0 at that point.
- **Aggregate cap:** 8 of 20 requests used, all `200`; budget file `{limit: 20, used: 8}`.

## Isolation, including a false alarm I had to resolve

Built-in sandbox verification passed. Ten readability probes are **ABSENT**: ssh key, AWS
credentials, Codex auth, gh hosts, netrc, host Pi auth, this repo's `AGENTS.md`, its router skill,
its `.git/config`, and `projects/forge`.

The probe script's first gate reported the repo path `PRESENT` and failed the series. It was wrong:
a bind mount of a subdirectory leaves empty ancestor placeholders. Inside the sandbox that path
lists only `eval`, its parent only `projects`, and all three real repo files are unreadable
(`eval/reports/e3a-probes/isolation-recheck.txt`). The checker now tests readability, not existence,
and the probe workspace defaults outside the repo.

I did **not** rerun the four probes to make the gate green: the authorization is a maximum of four
model runs, and a fifth would exceed it. The model evidence above stands; the placement issue is
recorded rather than hidden.

## Cost, and why the number is an estimate

Provider-reported cost is `0` because the sandbox's custom provider has no price metadata; token
counts are provider-reported. Cost is computed from the installed catalogue's rates, cache tokens
included:

| Run | Tokens | Estimate |
|---|---|---|
| haiku ×2 | 4,526 | $0.000057 |
| minimax ×2 | 3,330 | $0.000265 |
| **total** | 7,856 | **$0.000322** |

Well under the $0.02 ceiling. The number is advisory: it is not an invoice, and the provider may
bill differently (tiering, cache rules).

## What this does not show

Two probes of a one-word read prove reachability, identity fidelity, tool plumbing and usage
reporting. They say nothing about architecture or review quality, long-context behavior, reliability
under load, or cost on a real unit of work. `n=2` on a trivial task cannot rank models, and this
report does not.

## Registry update

`agents/models.json`: `minimax-m3` added as `measured` with availability/identity/tool/usage
evidence and `taskCategories: []` (no capability claim), plus the catalogue price with its source
named as a catalogue, not an invoice. `claude-sonnet-4-5` keeps `status: unknown` and now records
that `opencode-go` does not offer it.
