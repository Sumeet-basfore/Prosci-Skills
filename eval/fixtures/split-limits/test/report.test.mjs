import test from "node:test";
import assert from "node:assert/strict";
import { withinLimit } from "../src/report.mjs";

test("ten rows are within the default limit", () => {
  assert.equal(withinLimit(10), true);
});
