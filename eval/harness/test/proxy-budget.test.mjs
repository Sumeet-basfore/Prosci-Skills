import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROXY = join(dirname(fileURLToPath(import.meta.url)), "..", "proxy.mjs");

const start = async (budget) => {
  const dir = mkdtempSync(join(tmpdir(), "proxy-budget-"));
  const budgetFile = join(dir, "budget.json");
  const accessLog = join(dir, "access.jsonl");
  // A throwaway agent dir keeps the proxy's key lookup local and independent of the machine.
  const agentDir = join(dir, "agent");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "auth.json"), JSON.stringify({ "opencode-go": { key: "test-key" } }));
  writeFileSync(budgetFile, JSON.stringify({ limit: budget, used: 0 }));
  let stderr = "";
  const child = spawn(process.execPath, [PROXY], {
    env: { ...process.env, PROXY_PORT: "0", PROXY_UPSTREAM: "http://127.0.0.1:1", PROXY_BUDGET_FILE: budgetFile, PROXY_ACCESS_LOG: accessLog, PI_CODING_AGENT_DIR: agentDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (b) => { stderr += String(b); });
  const port = await new Promise((resolve, reject) => {
    child.stdout.on("data", (b) => { const m = /listening (\d+)/.exec(String(b)); if (m) resolve(Number(m[1])); });
    child.on("exit", () => reject(new Error(`proxy exited: ${stderr}`)));
  });
  return { child, port, budgetFile, accessLog, dir, agentDir };
};

// Warm-up uses a rejected path: the proxy checks method/path before reserving, so this spends nothing.
const warm = async (port) => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/warmup`, { method: "POST", body: "{}" });
      if (r.status === 404) return true;
    } catch { /* not accepting yet */ }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
};

const ask = (port) => fetch(`http://127.0.0.1:${port}/inference/go/v1/messages`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "claude-haiku-5-5", messages: [] }),
}).then((r) => r.status).catch(() => "network");

test("reserves before forwarding, so failed attempts still spend the budget", async () => {
  const p = await start(2);
  try {
    assert.ok(await warm(p.port), "proxy accepts requests");
    // Upstream is a closed port: each request fails after the reservation is taken.
    const codes = [await ask(p.port), await ask(p.port), await ask(p.port)];
    assert.deepEqual(codes, [502, 502, 429]);
    const used = JSON.parse(readFileSync(p.budgetFile, "utf8"));
    assert.deepEqual(used, { limit: 2, used: 2 });
    const lines = readFileSync(p.accessLog, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(lines.length, 3, "every request is recorded, including the denied one");
    assert.deepEqual(lines.map((l) => l.status), [502, 502, 429]);
  } finally { p.child.kill("SIGKILL"); rmSync(p.dir, { recursive: true, force: true }); }
});

test("a zero budget refuses every request without forwarding", async () => {
  const p = await start(0);
  try {
    assert.ok(await warm(p.port), "proxy accepts requests");
    assert.equal(await ask(p.port), 429);
    assert.equal(JSON.parse(readFileSync(p.budgetFile, "utf8")).used, 0);
  } finally { p.child.kill("SIGKILL"); rmSync(p.dir, { recursive: true, force: true }); }
});

test("a missing credential fails closed after reserving, not by resetting the connection", async () => {
  const p = await start(2);
  try {
    rmSync(join(p.agentDir, "auth.json"));
    assert.ok(await warm(p.port), "proxy accepts requests");
    assert.equal(await ask(p.port), 503);
    // The reservation is taken before the credential check, so a misconfiguration cannot be retried for free.
    assert.equal(JSON.parse(readFileSync(p.budgetFile, "utf8")).used, 1);
  } finally { p.child.kill("SIGKILL"); rmSync(p.dir, { recursive: true, force: true }); }
});
