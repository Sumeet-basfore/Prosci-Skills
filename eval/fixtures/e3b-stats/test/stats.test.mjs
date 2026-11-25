import test from "node:test";
import assert from "node:assert/strict";
import { median } from "../src/stats.mjs";

test("odd count returns the middle value", () => {
  assert.equal(median([3, 1, 2]), 2);
});

test("even count returns the mean of the middle two", () => {
  assert.equal(median([4, 1, 3, 2]), 2.5);
});
