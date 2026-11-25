// E3a: four model probes under one request cap, behind the same boundary E2 used.
//
// What this proves: a model is reachable through the proxy, reports the identity that was requested,
// can call a tool, and returns usage. What it does not prove: answer quality. Two probes are an
// availability test, not a benchmark.
//
//   node eval/harness/probe.mjs --out <dir> [--request-cap 8] [--cost-cap 0.02]

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SANDBOX = join(HERE, "sandbox.sh");
const PROXY = join(HERE, "proxy.mjs");
const ROOT = resolve(HERE, "..", "..");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const OUT = resolve(arg("out", join(ROOT, "eval", "runs", "e3a-probes")));
const REQUEST_CAP = Number(arg("request-cap", "20"));
const COST_CAP = Number(arg("cost-cap", "0.02"));

const MODELS = [
  { id: "haiku-1", provider: "prosci-proxy-anthropic", upstream: "claude-haiku-5-5" },
  { id: "haiku-2", provider: "prosci-proxy-anthropic", upstream: "claude-haiku-5-5" },
  { id: "minimax-1", provider: "prosci-proxy-anthropic", upstream: "minimax-m3" },
  { id: "minimax-2", provider: "prosci-proxy-anthropic", upstream: "minimax-m3" },
];
// Rates from the installed Pi catalogue (dist bundle, provider opencode-go), USD per million tokens.
// The provider's invoice is the authority; this is an estimate used only to stay under a ceiling.
// Cache tokens are most of the input on a repeated prompt; counting only `input` would understate cost.
const RATES = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "minimax-m3": { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
};
const TASK = "Use the read tool on data/probe.txt. Reply with the file's single word and nothing else.";

// Outside the repo on purpose: a bind mount of a repo subdirectory leaves empty ancestor
// placeholders that look like the repo from the inside, which is confusing evidence.
const ws = resolve(arg("ws", "/home/sumeet/.tmp/prosci-probe-ws"));
const home = join(ws, "home");
const agent = join(ws, "agent");
const app = join(ws, "app");
mkdirSync(join(app, "data"), { recursive: true });
mkdirSync(home, { recursive: true });
mkdirSync(agent, { recursive: true });
writeFileSync(join(app, "data", "probe.txt"), "amber\n");
writeFileSync(join(agent, "auth.json"), JSON.stringify({ "opencode-go": { key: "sandbox-dummy-token" } }));

const startProxy = async () => {
  const child = spawn(process.execPath, [PROXY], {
    env: {
      ...process.env,
      PROXY_PORT: "0",
      PROXY_MAX_REQUESTS: String(REQUEST_CAP),
      PROXY_BUDGET_FILE: join(OUT, "budget.json"),
      PROXY_ACCESS_LOG: join(OUT, "access.jsonl"),
      PROXY_MODELS: [...new Set(MODELS.map((m) => m.upstream))].join(","),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((done, fail) => {
    child.stdout.on("data", (b) => { const m = /listening (\d+)/.exec(String(b)); if (m) done(Number(m[1])); });
    child.on("exit", (code) => fail(new Error(`proxy exited ${code}`)));
  });
  return { child, port };
};

const writeModels = (port) => writeFileSync(join(agent, "models.json"), JSON.stringify({ providers: {
  "prosci-proxy-anthropic": {
    api: "anthropic-messages", baseUrl: `http://127.0.0.1:${port}/inference/go/anthropic`,
    apiKey: "sandbox-dummy-token", models: [{ id: "claude-haiku-5-5" }, { id: "minimax-m3" }],
  },
} }, null, 2));

const probeRun = (m) => {
  const run = spawnSync("sh", [SANDBOX, ws, home, agent, "sh", "-c",
    `cd app && pi -p --mode json --model ${m.provider}/${m.upstream} --thinking low ${JSON.stringify(TASK)}`],
  { encoding: "utf8", timeout: 240000 });
  writeFileSync(join(OUT, `run-${m.id}.jsonl`), run.stdout ?? "");
  writeFileSync(join(OUT, `run-${m.id}.err`), run.stderr ?? "");
  const events = (run.stdout ?? "").split("\n").filter((l) => l.trim()).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
  const assistant = events.filter((e) => e.type === "message_end" && e.message?.role === "assistant").map((e) => e.message);
  const last = assistant.at(-1);
  const reported = [...new Set(assistant.map((a) => `${a.provider ?? "?"}/${a.model ?? "?"}`))];
  const toolCalls = assistant.flatMap((a) => (a.content ?? []).filter((c) => c.type === "toolCall").map((c) => c.name));
  const text = (last?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(" ").trim();
  const usage = last?.usage ?? null;
  const checks = {
    exitZero: run.status === 0,
    identity: reported.length === 1 && reported[0].endsWith(`/${m.upstream}`),
    toolCalled: toolCalls.includes("read"),
    answer: /amber/i.test(text),
    usageReported: Boolean(usage && (usage.totalTokens > 0 || usage.input > 0)),
  };
  const rates = RATES[m.upstream];
  const input = usage?.input ?? usage?.promptTokens ?? usage?.totalTokens ?? 0;
  const output = usage?.output ?? usage?.completionTokens ?? 0;
  const cacheRead = usage?.cacheRead ?? 0;
  const cacheWrite = usage?.cacheWrite ?? 0;
  const cost = (input * rates.input + output * rates.output + cacheRead * rates.cacheRead + cacheWrite * rates.cacheWrite) / 1e6;
  return { model: `${m.provider}/${m.upstream}`, reported, toolCalls, text: text.slice(0, 120), usage, cost, checks, ok: Object.values(checks).every(Boolean) };
};

const isolation = () => {
  const verify = spawnSync("sh", [SANDBOX, "--verify", ws, home, agent], { encoding: "utf8" });
  const probes = [
    "/home/sumeet/.ssh/id_ed25519", "/home/sumeet/.aws/credentials", "/home/sumeet/.codex/auth.json",
    "/home/sumeet/.config/gh/hosts.yml", "/home/sumeet/.netrc", "/home/sumeet/.pi/agent/auth.json",
    "/home/sumeet/personal-repo/projects/prosci", "/home/sumeet/personal-repo/projects/forge",
  ].map((p) => ({
    path: p,
    // Readability, not existence: a bind mount can leave an empty placeholder with the same path.
    state: spawnSync("sh", [SANDBOX, ws, home, agent, "sh", "-c", `cat '${p}' >/dev/null 2>&1 && echo READABLE || echo ABSENT`], { encoding: "utf8" }).stdout.trim(),
  }));
  const positive = spawnSync("sh", [SANDBOX, ws, home, agent, "sh", "-c", "git --version >/dev/null && node --version >/dev/null && echo ok"], { encoding: "utf8" }).stdout.trim();
  return { verifyOk: verify.status === 0, verify: (verify.stdout + verify.stderr).trim().split("\n"), probes, positive };
};

const start = Date.now();
writeFileSync(join(OUT, "budget.json"), JSON.stringify({ schema: 1, limit: REQUEST_CAP, used: 0 }));
const proxy = await startProxy();
writeModels(proxy.port);

// The allowlist must reject a model before reserving. This is not one of the four model runs.
const denied = await fetch(`http://127.0.0.1:${proxy.port}/inference/go/v1/messages`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: "claude-sonnet-4-5", messages: [] }),
}).then((r) => r.status).catch(() => "network");

const iso = isolation();
// A ceiling that is only checked afterwards is not a ceiling. Stop before a run once the estimate
// already reaches it; the request budget is the hard gate.
const runs = [];
for (const m of MODELS) {
  const spent = runs.reduce((n, r) => n + r.cost, 0);
  if (spent >= COST_CAP) { runs.push({ model: `${m.provider}/${m.upstream}`, ok: false, checks: { skipped: true }, cost: 0 }); continue; }
  runs.push(probeRun(m));
}
proxy.child.kill("SIGTERM");

const budget = existsSync(join(OUT, "budget.json")) ? JSON.parse(readFileSync(join(OUT, "budget.json"), "utf8")) : null;
const total = runs.reduce((n, r) => n + r.cost, 0);
const summary = {
  startedAt: start, finishedAt: Date.now(), requestCap: REQUEST_CAP, costCap: COST_CAP,
  budget, allowlistDenied: denied === 403, isolation: iso, runs,
  totalCostEstimateUsd: Number(total.toFixed(6)),
  costWithinCap: total <= COST_CAP,
  passed: iso.verifyOk && iso.probes.every((p) => p.state === "ABSENT") && denied === 403 && runs.every((r) => r.ok) && total <= COST_CAP,
};
writeFileSync(join(OUT, "probe.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  passed: summary.passed, requests: budget, allowlistDenied: denied,
  cost: summary.totalCostEstimateUsd,
  runs: runs.map((r) => ({ model: r.model, ok: r.ok, checks: r.checks, tokens: r.usage?.totalTokens, ms: r.usage ? undefined : undefined })),
}, null, 2));
process.exit(summary.passed ? 0 : 1);
