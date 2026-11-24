import test from "node:test";
import assert from "node:assert/strict";
import { toJson } from "../src/json-output.mjs";
import { toText } from "../src/text-output.mjs";

test("json output", () => { assert.equal(toJson(1), '{"value":1}'); });
test("text output", () => { assert.equal(toText(1), "value: 1"); });
