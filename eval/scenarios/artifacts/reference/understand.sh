#!/bin/sh
set -eu
cat >> AGENTS.md <<'MD'

## Working model

- Entry point: `src/ledger.mjs` exports `post(entries)`; the reporting tool calls it.
- Boundary: the module owns summation only; it holds no state.
- Tests: `test/ledger.test.mjs` covers a zero-sum posting. Run with `node --test`.
- Constraint: no dependencies; plain ESM with `.mjs` extensions.
- Risk: no test for an empty entry list.
MD
