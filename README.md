# prosci

A gate and a record for every repository on this machine, plus the research that led to it.

```sh
bin/context-doctor                    # static check across every project repo
bin/verify ../lore                    # run one repo's block, write a receipt
bin/install-gate ../lore              # write the server-side workflow into a repo
node --test bin/test/                 # the tools' own tests
```

Each repository states its own typecheck, test, and build commands in a fenced `factory` block
in its `AGENTS.md`. `bin/context-doctor` proves those commands resolve without running them.
`bin/verify` runs them and appends one JSON line to `~/.local/state/factory/verify.jsonl` with
the repo, commit, dirty flag, per-command exit and duration, and a receipt id.

Read `AGENTS.md` for the contract, `docs/plan/factory-v1.md` for what is built and what is not,
and `docs/research/` for the report and mind map behind the design.
