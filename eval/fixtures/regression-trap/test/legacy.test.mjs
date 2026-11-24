import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/parse.mjs";

test("a value may contain an equals sign", () => {
  assert.deepEqual(parse("query=a=b"), { key: "query", value: "a=b" });
});

test("surrounding whitespace is trimmed", () => {
  assert.deepEqual(parse("  key =  value  "), { key: "key", value: "value" });
});
