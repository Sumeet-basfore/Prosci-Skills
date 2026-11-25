#!/usr/bin/env node
// Start and stop one proxy per arm, and prove it is the process that was started.
//
// A shell that backgrounds `env ... node proxy.mjs` can capture the wrapper's pid; killing that leaves the
// proxy alive and the next arm silently joins it. This owns the child directly, records its pid, checks the
// identity endpoint before returning, and on stop waits for the process and the port to actually go away.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, openSync } from "node:fs";
import { connect } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
void here;
const PROXY = resolve("eval/harness/proxy.mjs");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const port = Number(arg("port", 0));
const pidFile = arg("pid-file");
const identityUrl = `http://127.0.0.1:${port}`;

function portOpen() {
  return new Promise((done) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.setTimeout(400);
    socket.once("connect", () => { socket.destroy(); done(true); });
    socket.once("timeout", () => { socket.destroy(); done(true); });
    socket.once("error", () => done(false));
  });
}

async function identity() {
  try {
    const response = await fetch(`${identityUrl}/__identity`, { signal: AbortSignal.timeout(800) });
    return await response.json();
  } catch {
    return null;
  }
}

async function start() {
  if (!port || !pidFile) throw new Error("start needs --port and --pid-file");
  if (await portOpen()) throw new Error(`port ${port} is already in use; refusing to share it`);
  const logPath = arg("log", join(dirname(pidFile), "proxy.log"));
  const log = openSync(logPath, "a");
  const child = spawn(process.execPath, [PROXY], {
    env: {
      ...process.env,
      PROXY_PORT: String(port),
      PROXY_EXECUTION_ID: arg("execution-id", `adhoc-${process.pid}`),
      PROXY_PLAN_HASH: arg("plan-hash", ""),
      PROXY_BUDGET_FILE: arg("budget-file", ""),
      PROXY_ACCESS_LOG: arg("access-log", ""),
      PROXY_MODELS: arg("models", "claude-haiku-5-5"),
      PROXY_MAX_REQUESTS: arg("max-requests", "24"),
      ...(arg("upstream") ? { PROXY_UPSTREAM: arg("upstream") } : {}),
    },
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  writeFileSync(pidFile, JSON.stringify({ pid: child.pid, port, log: logPath }));
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    const info = await identity();
    if (info) {
      console.log(JSON.stringify({ ok: true, pid: child.pid, port, identity: info, log: logPath }));
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  try { process.kill(-child.pid, "SIGKILL"); } catch {}
  const tail = existsSync(logPath) ? readFileSync(logPath, "utf8").trim().split("\n").slice(-2).join(" | ") : "";
  throw new Error(`proxy did not become ready on ${port}${tail ? `: ${tail}` : ""}`);
}

async function stop() {
  if (!existsSync(pidFile)) throw new Error(`no pid file at ${pidFile}`);
  const { pid, port: recordedPort } = JSON.parse(readFileSync(pidFile, "utf8"));
  let alive = true;
  try { process.kill(pid, 0); } catch { alive = false; }
  if (alive) {
    try { process.kill(-pid, "SIGTERM"); } catch { try { process.kill(pid, "SIGTERM"); } catch {} }
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      try { process.kill(pid, 0); } catch { alive = false; break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (alive) {
      try { process.kill(-pid, "SIGKILL"); } catch {}
      await new Promise((r) => setTimeout(r, 200));
      try { process.kill(pid, 0); } catch { alive = false; }
    }
  }
  const open = await portOpen();
  const ok = !alive && !open;
  console.log(JSON.stringify({ ok, pid, port: recordedPort ?? port, processAlive: alive, portOpen: open }));
  if (!ok) process.exitCode = 1;
}

async function status() {
  const info = await identity();
  if (!info) throw new Error(`no proxy on ${identityUrl}`);
  console.log(JSON.stringify({ ok: true, port, identity: info }));
}

try {
  if (process.argv[2] === "start") await start();
  else if (process.argv[2] === "stop") await stop();
  else if (process.argv[2] === "status") await status();
  else throw new Error("usage: proxyctl start|stop|status --port N --pid-file P");
} catch (error) {
  console.error(String(error.message ?? error));
  process.exitCode = 1;
}
