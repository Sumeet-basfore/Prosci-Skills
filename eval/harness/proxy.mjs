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
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const UPSTREAM = "https://opencode.ai";
const ALLOWED_PREFIX = "/inference/go/";
const IDLE_MS = 10 * 60 * 1000;
const PORT = Number(process.env.PROXY_PORT ?? 0);

function realKey() {
  const dir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
  const auth = JSON.parse(readFileSync(join(dir, "auth.json"), "utf8"));
  const key = auth["opencode-go"]?.key;
  if (!key) throw new Error("no opencode-go key in the auth store");
  return key;
}

const key = realKey();
let idle = setTimeout(() => process.exit(0), IDLE_MS);

const server = createServer((req, res) => {
  idle.refresh();
  if (!req.url?.startsWith(ALLOWED_PREFIX)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "outside the allowed inference path" }));
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.authorization;
    delete headers["x-api-key"];
    headers["x-api-key"] = key;
    headers.authorization = `Bearer ${key}`;
    // The gateway routes on a session header. One per series is honest: these runs are sessions.
    headers["x-opencode-session"] ??= `prosci-eval-${process.pid}`;

    try {
      const upstream = await fetch(`${UPSTREAM}${req.url}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
      });
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      const body = Buffer.from(await upstream.arrayBuffer());
      res.end(body);
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  const { port } = server.address();
  // The harness reads this line to learn the port.
  console.log(`prosci-proxy listening ${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => process.exit(0));
}
