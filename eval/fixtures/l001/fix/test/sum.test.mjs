import test from "node:test";
import assert from "node:assert/strict";
import { sum } from "../src/sum.mjs";

test("adds two positive numbers", () => {
  assert.equal(sum(2, 3), 5);
});

test("adds a negative number", () => {
  assert.equal(sum(-4, 1), -3);
});
