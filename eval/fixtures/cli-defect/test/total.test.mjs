import test from "node:test";
import assert from "node:assert/strict";
import { total } from "../src/total.mjs";

test("sums a non-empty set", () => {
  assert.equal(total([{ cents: 100 }, { cents: 250 }]), 350);
});
