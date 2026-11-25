// The reservation is the only thing standing between concurrency and an overspend. These tests use real
// child processes so the contention is real, not simulated.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { openBudget, reserve, usage } from "../lib/request-budget.mjs";

const LIB = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "request-budget.mjs");

function runReservers(path, n) {
  const script = `
    const { reserve } = await import(${JSON.stringify(LIB)});
    const r = reserve(${JSON.stringify(path)});
    process.stdout.write(r.ok ? "ok" : "denied");
  `;
  return Promise.all(Array.from({ length: n }, () => new Promise((resolve) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (c) => { out += c; });
    child.on("close", () => resolve(out.trim()));
  })));
}

test("concurrent reservations never exceed the limit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  const path = join(dir, "budget.json");
  openBudget(path, 5);
  const results = await runReservers(path, 20);
  assert.equal(results.filter((r) => r === "ok").length, 5);
  assert.equal(results.filter((r) => r === "denied").length, 15);
  assert.equal(usage(path).used, 5);
  rmSync(dir, { recursive: true, force: true });
});

test("a denied reservation does not consume budget", () => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  const path = join(dir, "budget.json");
  openBudget(path, 1);
  assert.equal(reserve(path).ok, true);
  for (let i = 0; i < 5; i += 1) assert.equal(reserve(path).ok, false);
  assert.equal(usage(path).used, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("exhaustion is reported with the remaining zero", () => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  const path = join(dir, "budget.json");
  openBudget(path, 2);
  reserve(path); reserve(path);
  const denied = reserve(path);
  assert.deepEqual({ ok: denied.ok, remaining: denied.remaining }, { ok: false, remaining: 0 });
  rmSync(dir, { recursive: true, force: true });
});

test("a stale lock from a crashed process is reclaimed", () => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  const path = join(dir, "budget.json");
  openBudget(path, 3);
  // Simulate a crash: an abandoned lock with an old mtime.
  writeFileSync(`${path}.lock`, "");
  const old = Date.now() / 1000 - 60;
  utimesSync(`${path}.lock`, old, old);
  assert.equal(reserve(path).ok, true);
  assert.equal(usage(path).used, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("usage survives a restart: the file, not memory, is the source of truth", () => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  const path = join(dir, "budget.json");
  openBudget(path, 4);
  reserve(path); reserve(path);
  const reread = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(reread.used, 2);
  assert.equal(existsSync(path), true);
  rmSync(dir, { recursive: true, force: true });
});
