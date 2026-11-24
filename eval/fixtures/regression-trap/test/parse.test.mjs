import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/parse.mjs";

test("parses key=value", () => {
  assert.deepEqual(parse("name=tea"), { key: "name", value: "tea" });
});
