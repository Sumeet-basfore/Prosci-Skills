// Credential isolation for evaluation runs.
//
// The model process runs inside a sandbox with a dummy token. This proxy runs outside it, holds the
// real provider key, and forwards only to the inference path. A tool call inside the sandbox can read
// the dummy token; reading it buys nothing, because the proxy is the only thing that can spend money
// and it lives outside the boundary the agent controls.
//
// Not a daemon: started per series by the harness, exits when the parent closes or after the idle
// timeout.

import { createServer } from "node:http";
import { appendFileSync } from "node:fs";
import { reserve } from "../../bin/lib/request-budget.mjs";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const UPSTREAM = process.env.PROXY_UPSTREAM ?? "https://opencode.ai";
const ALLOWED_PREFIX = "/inference/go/";
const IDLE_MS = 10 * 60 * 1000;
const PORT = Number(process.env.PROXY_PORT ?? 0);
// Bounded spending and endpoint restriction. A run cannot ask for another model, another route, or
// more requests than its series is allowed.
const MAX_REQUESTS = Number(process.env.PROXY_MAX_REQUESTS ?? 200);
const BUDGET_FILE = process.env.PROXY_BUDGET_FILE ?? null;
const ACCESS_LOG = process.env.PROXY_ACCESS_LOG ?? null;
// Which arm this proxy may serve. A second arm starting on this port must fail rather than join it.
const EXECUTION_ID = process.env.PROXY_EXECUTION_ID ?? `adhoc-${process.pid}`;
const PLAN_HASH = process.env.PROXY_PLAN_HASH ?? null;
let reserved = 0;
const MAX_BODY = 2 * 1024 * 1024;
// A series may only ask for the models its plan names. Adding a model is a deliberate change to the
// allowlist, not a side effect of a plan file.
const MODELS = new Set(String(process.env.PROXY_MODELS ?? "claude-haiku-5-5").split(",").map((m) => m.trim()).filter(Boolean));
let requests = 0;

// One line per request that mattered: who it was for, what it asked, what the budget said. Headers are
// never logged; the credential exists only in this process.
function log(entry) {
  if (!ACCESS_LOG) return;
  appendFileSync(ACCESS_LOG, JSON.stringify({ at: Date.now(), executionId: EXECUTION_ID, planHash: PLAN_HASH, ...entry }) + "\n");
}

function realKey() {
  const dir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
  const auth = JSON.parse(readFileSync(join(dir, "auth.json"), "utf8"));
  const key = auth["opencode-go"]?.key;
  if (!key) throw new Error("no opencode-go key in the auth store");
  return key;
}

let cachedKey = null;
// Read lazily: the budget and denial paths must work without credentials (CI, negative tests).
const key = () => (cachedKey ??= realKey());
let idle = setTimeout(() => process.exit(0), IDLE_MS);

const server = createServer((req, res) => {
  idle.refresh();
  if (req.method === "GET" && req.url === "/__identity") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ executionId: EXECUTION_ID, planHash: PLAN_HASH, budgetFile: BUDGET_FILE, models: [...MODELS], pid: process.pid }));
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "only POST is forwarded" }));
    return;
  }
  if (!req.url?.startsWith(ALLOWED_PREFIX)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "outside the allowed inference path" }));
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    if (chunks.reduce((n, c) => n + c.length, 0) > MAX_BODY) {
      res.writeHead(413, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "request body too large" }));
      return;
    }
    let requested = null;
    try {
      requested = JSON.parse(Buffer.concat(chunks).toString("utf8")).model ?? null;
    } catch {
      requested = null;
    }
    if (requested && !MODELS.has(String(requested))) {
      log({ model: requested, endpoint: req.url, reserved: false, status: 403 });
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `model not allowed for evaluation: ${requested}` }));
      return;
    }
    // Reserve last, immediately before forwarding: a request rejected for its method, path or model must
    // not burn budget. With concurrency, counting afterwards lets workers exceed the approved limit.
    let reservation = null;
    if (BUDGET_FILE) {
      try {
        reservation = reserve(BUDGET_FILE);
      } catch (error) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: `budget unavailable: ${String(error)}` }));
        return;
      }
      if (!reservation.ok) {
        log({ model: requested, endpoint: req.url, reserved: false, status: 429, budgetUsed: reservation.used });
        res.writeHead(429, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "request budget exhausted", used: reservation.used, limit: reservation.limit }));
        return;
      }
    }
    requests += 1;
    if (requests > MAX_REQUESTS) {
      res.writeHead(429, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "request budget for this series is exhausted" }));
      return;
    }
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.authorization;
    delete headers["x-api-key"];
    let localKey;
    try {
      localKey = key();
    } catch (error) {
      // No credential is a configuration failure, not a provider failure; say so instead of resetting.
      log({ model: requested, endpoint: req.url, reserved: Boolean(reservation), status: 503, error: String(error) });
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `no upstream credential: ${String(error)}` }));
      return;
    }
    headers["x-api-key"] = localKey;
    headers.authorization = `Bearer ${key()}`;
    // The gateway routes on a session header. One per series is honest: these runs are sessions.
    headers["x-opencode-session"] ??= `prosci-eval-${process.pid}`;

    try {
      const upstream = await fetch(`${UPSTREAM}${req.url}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
      });
      log({ model: requested, endpoint: req.url, reserved: Boolean(reservation), status: upstream.status, budgetUsed: reservation?.used ?? null });
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      const body = Buffer.from(await upstream.arrayBuffer());
      res.end(body);
    } catch (error) {
      // A failed forward still consumed its reservation, so it must appear in the access log.
      log({ model: requested, endpoint: req.url, reserved: Boolean(reservation), status: 502, budgetUsed: reservation?.used ?? null, error: String(error) });
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
    }
  });
});

server.on("error", (error) => {
  // Refusing to share a port is the point: a second arm must not inherit the first arm's budget.
  console.error(`prosci-proxy could not bind 127.0.0.1:${PORT}: ${error.code ?? error.message}`);
  process.exit(2);
});

server.listen(PORT, "127.0.0.1", () => {
  const { port } = server.address();
  // The harness reads this line to learn the port.
  console.log(`prosci-proxy listening ${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => process.exit(0));
}
