import test from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/normalize.mjs";

test("normalize trims and lowercases", () => {
  assert.equal(normalize("  Report  "), "report");
});
