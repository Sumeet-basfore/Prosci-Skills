#!/bin/sh
set -eu
cat > bin/test/mistyped.test.mjs <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { parseFactoryBlock } from "../lib/factory-block.mjs";

test("an unknown key does not throw", () => {
  assert.doesNotThrow(() => parseFactoryBlock("```factory\ntset: node --test\n```"));
});
JS
