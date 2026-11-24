import test from "node:test";
import assert from "node:assert/strict";
import { levelFor } from "../src/level.mjs";

test("maps counts to levels", () => {
  assert.equal(levelFor(1), "info");
  assert.equal(levelFor(50), "warn");
  assert.equal(levelFor(500), "error");
});
