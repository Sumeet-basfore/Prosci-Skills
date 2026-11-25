#!/bin/sh
# Two changes cut from the same base. Each is valid alone; together they contradict.
set -eu
base=$(git rev-parse HEAD)

git checkout -q -b feature-a
python3 - <<'PY'
p = "src/config.mjs"
open(p, "w").write("export const DEFAULT_LIMIT = 5;\n")
PY
cat > test/report.test.mjs <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { withinLimit } from "../src/report.mjs";

test("five rows are within the lowered limit", () => {
  assert.equal(withinLimit(5), true);
});
JS
cat > test/limit.test.mjs <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { withinLimit } from "../src/report.mjs";

test("six rows exceed the lowered limit", () => {
  assert.equal(withinLimit(6), false);
});
JS
git add -A
git -c user.name=eval -c user.email=e@l commit -qm "lower the report limit to 5"

git checkout -q "$base"
git checkout -q -b feature-b
cat > src/batch.mjs <<'JS'
export const BATCH_SIZE = 8;

export function planBatches(items) {
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));
  return batches;
}
JS
cat > test/batch.test.mjs <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { planBatches } from "../src/batch.mjs";

test("splits work into batches of eight", () => {
  assert.equal(planBatches(new Array(9).fill(0)).length, 2);
});
JS
git add -A
git -c user.name=eval -c user.email=e@l commit -qm "add batch planning at eight per batch"

git checkout -q "$base"
