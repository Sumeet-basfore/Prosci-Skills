// Regression coverage for the two Phase D discrepancies: an approval that could be spent more than once,
// and retries raised by the plan beyond what was authorized.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRecord, saveRecord, loadRecord, claimExecution, effectiveRetries, chargeRequests, remainingRequests,
} from "../lib/exec-auth.mjs";

test("one authorization permits exactly one execution", () => {
  const record = createRecord({ planHash: "abc", maxExecutions: 1 });
  assert.equal(claimExecution(record, { planHash: "abc" }).ok, true);
  const second = claimExecution(record, { planHash: "abc" });
  assert.equal(second.ok, false);
  assert.match(second.reason, /1 execution\(s\); 1 already used/);
});

test("an authorization cannot be reused for a different plan", () => {
  const record = createRecord({ planHash: "abc" });
  assert.equal(claimExecution(record, { planHash: "def" }).ok, false);
});

test("a record survives a restart, so a crash does not reset the count", () => {
  const dir = mkdtempSync(join(tmpdir(), "auth-"));
  const path = join(dir, "auth.json");
  const record = createRecord({ planHash: "abc" });
  claimExecution(record, { planHash: "abc" });
  saveRecord(path, record);

  const reloaded = loadRecord(path, "abc");
  assert.equal(reloaded.executions, 1);
  assert.equal(claimExecution(reloaded, { planHash: "abc" }).ok, false);
  rmSync(dir, { recursive: true, force: true });
});

test("retries are clamped to the authorized maximum, even when the plan asks for more", () => {
  const record = createRecord({ planHash: "abc", maxRetriesPerUnit: 1 });
  assert.equal(effectiveRetries(record, 5), 1);
  assert.equal(effectiveRetries(record, 0), 0);
  assert.equal(effectiveRetries(record, undefined), 0);
});

test("without an authorization record, retries are zero", () => {
  assert.equal(effectiveRetries(null, 3), 0);
});

test("requests aggregate across failed or interrupted attempts", () => {
  const record = createRecord({ planHash: "abc", maxRequests: 100 });
  assert.equal(chargeRequests(record, 60).ok, true);
  assert.equal(remainingRequests(record), 40);
  assert.equal(chargeRequests(record, 30).ok, true);
  assert.equal(remainingRequests(record), 10);
  const over = chargeRequests(record, 25);
  assert.equal(over.ok, false);
  assert.equal(over.remaining, -15);
  assert.equal(record.requestsUsed, 115);
});

test("three executions consume three claims and record them", () => {
  const record = createRecord({ planHash: "abc", maxExecutions: 3 });
  for (let i = 1; i <= 3; i += 1) assert.equal(claimExecution(record, { planHash: "abc" }).execution, i);
  assert.equal(claimExecution(record, { planHash: "abc" }).ok, false);
  assert.equal(record.history.length, 3);
});
