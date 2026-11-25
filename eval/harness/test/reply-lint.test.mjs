import test from "node:test";
import assert from "node:assert/strict";
import { lintReplyAssertion } from "../lib.mjs";

const base = {
  reply_contains: ["truncat", "records\\.json"],
  paraphrases: [
    "The plan truncates data/records.json before reading it.",
    "Truncating records.json destroys the original.",
  ],
  bland_reply: "Looks good to me.",
  wrong_reply: "The plan appends to a new file and is safe.",
};

test("passes when two paraphrases match and both decoys miss", () => {
  assert.deepEqual(lintReplyAssertion(base), { ok: true, problems: [] });
});

test("fails when the assertion is shaped to one phrasing", () => {
  const strict = { ...base, reply_contains: ["truncates data/records\\.json before"] };
  const result = lintReplyAssertion(strict);
  assert.equal(result.ok, false);
  assert.match(result.problems.join(" "), /paraphrase 2 misses/);
});

test("fails when a decoy reply would pass", () => {
  const loose = { ...base, reply_contains: ["the"] };
  const result = lintReplyAssertion(loose);
  assert.equal(result.ok, false);
  assert.match(result.problems.join(" "), /reply passes, so the assertion cannot detect it/);
});

test("requires two paraphrases", () => {
  const thin = { ...base, paraphrases: ["only one"] };
  assert.match(lintReplyAssertion(thin).problems.join(" "), /at least two paraphrases/);
});
