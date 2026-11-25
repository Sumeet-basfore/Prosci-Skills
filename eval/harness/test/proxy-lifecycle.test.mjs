import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { verifyProxyIdentity } from "../../../bin/lib/exec-guard.mjs";

function freePort() {
  return new Promise((done) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

function ctl(args) {
  return spawnSync(process.execPath, ["eval/harness/proxyctl.mjs", ...args], { encoding: "utf8", timeout: 15000 });
}

function start({ port, pid, execId, budget, log, upstream, models = "claude-haiku-5-5" }) {
  return ctl(["start", "--port", String(port), "--pid-file", pid, "--execution-id", execId,
    "--plan-hash", "plan-" + execId, "--budget-file", budget, "--access-log", log,
    "--models", models, "--upstream", upstream, "--max-requests", "10"]);
}

async function post(port, model, path = "/inference/go/anthropic/v1/messages") {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer supersecret-dummy" },
    body: JSON.stringify({ model, messages: [] }),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test("one proxy per arm: occupied ports refuse, identities stay separate, budgets do not mix", async () => {
  const dir = mkdtempSync(join(tmpdir(), "proxyctl-"));
  const upstream = createServer((req, res) => { req.resume(); res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); });
  await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  try {
    const p1 = await freePort();
    const p2 = await freePort();
    const budget1 = join(dir, "b1.json"); const budget2 = join(dir, "b2.json");
    writeFileSync(budget1, '{"schema":1,"limit":5,"used":0}');
    writeFileSync(budget2, '{"schema":1,"limit":5,"used":0}');
    const log1 = join(dir, "a1.jsonl");
    const a = start({ port: p1, pid: join(dir, "a.pid"), execId: "arm-a", budget: budget1, log: log1, upstream: upstreamUrl });
    assert.equal(a.status, 0, a.stderr);
    const c = start({ port: p2, pid: join(dir, "c.pid"), execId: "arm-c", budget: budget2, log: join(dir, "c.jsonl"), upstream: upstreamUrl });
    assert.equal(c.status, 0, c.stderr);

    const second = start({ port: p1, pid: join(dir, "a2.pid"), execId: "arm-b", budget: join(dir, "b3.json"), log: join(dir, "b3.jsonl"), upstream: upstreamUrl });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already in use/);

    assert.equal((await verifyProxyIdentity(`http://127.0.0.1:${p1}`, { executionId: "arm-a", planHash: "plan-arm-a" })).ok, true);
    const wrong = await verifyProxyIdentity(`http://127.0.0.1:${p1}`, { executionId: "arm-b", planHash: "plan-arm-b" });
    assert.equal(wrong.ok, false);
    assert.match(wrong.problems.join(" "), /belongs to execution arm-a/);

    const denied = await post(p1, "claude-sonnet-4-5");
    assert.equal(denied.status, 403);
    assert.equal(JSON.parse(readFileSync(budget1, "utf8")).used, 0, "a denied model must not reserve");

    assert.equal((await post(p1, "claude-haiku-5-5")).status, 200);
    assert.equal(JSON.parse(readFileSync(budget1, "utf8")).used, 1);
    assert.equal(JSON.parse(readFileSync(budget2, "utf8")).used, 0, "the other arm's budget is untouched");

    const entry = JSON.parse(readFileSync(log1, "utf8").trim().split("\n").at(-1));
    for (const field of ["executionId", "planHash", "model", "endpoint", "reserved", "status", "at"]) assert.ok(field in entry, `missing ${field}`);
    assert.equal(entry.executionId, "arm-a");
    assert.equal(entry.status, 200);
    assert.doesNotMatch(readFileSync(log1, "utf8"), /supersecret|authorization|x-api-key/i);

    const stopped = ctl(["stop", "--pid-file", join(dir, "a.pid")]);
    assert.equal(stopped.status, 0, stopped.stderr);
    const result = JSON.parse(stopped.stdout.trim().split("\n").at(-1));
    assert.equal(result.ok, true);
    assert.equal(result.processAlive, false);
    assert.equal(result.portOpen, false);
    // The other arm was not touched by stopping this one, so it can still be stopped cleanly.
    assert.equal(ctl(["stop", "--pid-file", join(dir, "c.pid")]).status, 0);
  } finally {
    ctl(["stop", "--pid-file", join(dir, "c.pid")]);
    await new Promise((r) => upstream.close(r));
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-proxy listener on the port is refused before any worker starts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "proxyctl-"));
  const squatter = createServer((req, res) => { res.writeHead(200); res.end("not a proxy"); });
  await new Promise((r) => squatter.listen(0, "127.0.0.1", r));
  try {
    const port = squatter.address().port;
    const result = start({ port, pid: join(dir, "x.pid"), execId: "arm-x", budget: join(dir, "x.json"), log: join(dir, "x.jsonl"), upstream: "http://127.0.0.1:1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already in use/);
  } finally {
    await new Promise((r) => squatter.close(r));
    rmSync(dir, { recursive: true, force: true });
  }
});
