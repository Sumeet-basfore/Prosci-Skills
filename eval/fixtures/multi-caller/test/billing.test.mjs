import test from "node:test";
import assert from "node:assert/strict";
import { receiptLine } from "../src/receipt.mjs";
import { invoiceLine } from "../src/invoice.mjs";

test("receipt line formats cents", () => {
  assert.equal(receiptLine({ name: "tea", cents: 250 }), "tea: 2.50");
});

test("invoice line formats cents", () => {
  assert.equal(invoiceLine({ name: "tea", cents: 250 }), "INV tea = 2.50");
});
