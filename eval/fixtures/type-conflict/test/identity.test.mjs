import test from "node:test";
import assert from "node:assert/strict";
import { userKey } from "../src/user.mjs";
import { orderTotal } from "../src/order.mjs";

test("user keys pad the id", () => { assert.equal(userKey(7), "user-0007"); });
test("order total adds the numeric id", () => { assert.equal(orderTotal(7, 100), 107); });
