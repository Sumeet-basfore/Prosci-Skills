import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROXY = join(dirname(fileURLToPath(import.meta.url)), "..", "proxy.mjs");

const start = async (budget) => {
  const dir = mkdtempSync(join(tmpdir(), "proxy-budget-"));
  const budgetFile = join(dir, "budget.json");
  const accessLog = join(dir, "access.jsonl");
  writeFileSync(budgetFile, JSON.stringify({ limit: budget, used: 0 }));
  const child = spawn(process.execPath, [PROXY], {
    env: { ...process.env, PROXY_PORT: "0", PROXY_UPSTREAM: "http://127.0.0.1:1", PROXY_BUDGET_FILE: budgetFile, PROXY_ACCESS_LOG: accessLog },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolve, reject) => {
    child.stdout.on("data", (b) => { const m = /listening (\d+)/.exec(String(b)); if (m) resolve(Number(m[1])); });
    child.on("exit", () => reject(new Error("proxy exited")));
  });
  return { child, port, budgetFile, accessLog, dir };
};

const ask = (port) => fetch(`http://127.0.0.1:${port}/inference/go/v1/messages`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "claude-haiku-5-5", messages: [] }),
}).then((r) => r.status).catch(() => "network");

test("reserves before forwarding, so failed attempts still spend the budget", async () => {
  const p = await start(2);
  try {
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
    assert.equal(await ask(p.port), 429);
    assert.equal(JSON.parse(readFileSync(p.budgetFile, "utf8")).used, 0);
  } finally { p.child.kill("SIGKILL"); rmSync(p.dir, { recursive: true, force: true }); }
});
