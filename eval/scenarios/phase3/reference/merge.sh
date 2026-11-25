#!/bin/sh
set -eu
git merge --no-ff -q feature-a -m "merge feature-a"
git merge --no-ff -q feature-b -m "merge feature-b"
# Combined state: batches of eight exceed the lowered limit of five. Lower the batch to the limit.
python3 - <<'PY'
p = "src/batch.mjs"
s = open(p).read().replace("export const BATCH_SIZE = 8;", "export const BATCH_SIZE = 5;")
open(p, "w").write(s)
PY
git add -A
git -c user.name=eval -c user.email=e@l commit -qm "keep batches within the lowered limit"
