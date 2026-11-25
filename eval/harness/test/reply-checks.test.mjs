import test from "node:test";
import assert from "node:assert/strict";
import { replyMatches } from "../lib.mjs";

test("matches a defect named in a reply, case-insensitively", () => {
  const r = replyMatches("The proposal truncates data/records.json before importing.", ["truncat", "records\\.json"]);
  assert.deepEqual(r.map((x) => x.ok), [true, true]);
});

test("fails when the reply only says it was reviewed", () => {
  const r = replyMatches("Looks good to me.", ["truncat", "records\\.json"]);
  assert.deepEqual(r.map((x) => x.ok), [false, false]);
});

test("supports a regex that requires absence of tests", () => {
  const r = replyMatches("There are no tests covering the import path.", ["(no|not).{0,20}tests?"]);
  assert.equal(r[0].ok, true);
});
