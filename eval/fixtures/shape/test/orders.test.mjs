import test from "node:test";
import assert from "node:assert/strict";
import { orderTotal } from "../src/orders.mjs";
import { applyDiscount } from "../src/pricing.mjs";

test("order total adds lines", () => { assert.equal(orderTotal({ lines: [{ cents: 100 }] }), 100); });
test("discount applies", () => { assert.equal(applyDiscount(100, 10), 90); });
