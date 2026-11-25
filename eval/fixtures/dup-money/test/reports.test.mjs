import test from "node:test";
import assert from "node:assert/strict";
import { receiptLine } from "../src/receipt.mjs";
import { invoiceLine } from "../src/invoice.mjs";
import { refundLine } from "../src/refund.mjs";

const item = { name: "tea", cents: 250 };

test("receipt line", () => assert.equal(receiptLine(item), "receipt: tea = 2.50"));
test("invoice line", () => assert.equal(invoiceLine(item), "invoice: tea = 2.50"));
test("refund line", () => assert.equal(refundLine(item), "refund: tea = 2.50"));
