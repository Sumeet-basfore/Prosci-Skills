#!/bin/sh
set -eu
cat >> README.md <<'MD'

## install-skills

- `--target <dir>`: where the skills are written.
- `--copy`: copy instead of linking, for a target on another filesystem.
- `--check`: report drift; exits 1 when the target differs from the source.
MD
