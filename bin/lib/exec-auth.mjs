// Execution authorization: one approval, one run, with caps the plan cannot raise.
//
// Three attempts were made where one was authorized, and a unit used three attempts where the authorization
// allowed one retry. Both came from the same hole: the controller trusted the plan for retries and treated
// the plan hash as reusable. This module holds the counter and the caps.
//
// A record is a file so it survives a crashed or interrupted attempt: restarting the controller must not
// reset the budget or the execution count.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function createRecord({ planHash, maxExecutions = 1, maxRetriesPerUnit = 1, maxRequests = 100 }) {
  return {
    schema: 1,
    planHash,
    maxExecutions,
    maxRetriesPerUnit,
    maxRequests,
    executions: 0,
    requestsUsed: 0,
    history: [],
  };
}

export function loadRecord(path, planHash) {
  if (!existsSync(path)) return null;
  const record = JSON.parse(readFileSync(path, "utf8"));
  if (record.planHash !== planHash) return null; // a different plan needs its own authorization
  return record;
}

export function saveRecord(path, record) {
  writeFileSync(path, JSON.stringify(record, null, 2));
}

// Claiming is the gate. It either increments and returns the record, or refuses with the reason.
export function claimExecution(record, { planHash, kind = "run" }) {
  if (record.planHash !== planHash) return { ok: false, reason: "authorization belongs to a different plan" };
  if (record.executions >= record.maxExecutions) {
    return { ok: false, reason: `authorization allows ${record.maxExecutions} execution(s); ${record.executions} already used` };
  }
  record.executions += 1;
  record.history.push({ execution: record.executions, kind, requestsBefore: record.requestsUsed });
  return { ok: true, record, execution: record.executions };
}

// Retries are the smaller of what the plan asks for and what the authorization permits. A plan cannot
// widen its own budget by declaring a larger number.
export function effectiveRetries(record, unitRetries) {
  const authorized = record?.maxRetriesPerUnit ?? 0;
  return Math.max(0, Math.min(Number(unitRetries ?? 0), authorized));
}

// Requests are charged per unit, not per execution: a failed or interrupted attempt still spends them.
export function chargeRequests(record, count) {
  record.requestsUsed += count;
  const remaining = record.maxRequests - record.requestsUsed;
  return { ok: remaining >= 0, remaining, used: record.requestsUsed, limit: record.maxRequests };
}

export function remainingRequests(record) {
  return Math.max(0, record.maxRequests - record.requestsUsed);
}
