import test from "node:test";
import assert from "node:assert/strict";
import { post } from "../src/ledger.mjs";

test("posting sums the entries", () => {
  assert.equal(post([{ amount: 5 }, { amount: -5 }]), 0);
});
