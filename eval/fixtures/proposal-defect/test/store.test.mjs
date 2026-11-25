import test from "node:test";
import assert from "node:assert/strict";
import { writeRecords } from "../src/store.mjs";

test("writes through the store", () => {
  assert.equal(writeRecords([{ id: 1 }]).written, 1);
});
