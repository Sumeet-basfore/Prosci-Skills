import test from "node:test";
import assert from "node:assert/strict";
import { total } from "../src/inventory.mjs";

test("totals quantities", () => {
  assert.equal(total([{ quantity: 2 }, { quantity: 3 }]), 5);
});
