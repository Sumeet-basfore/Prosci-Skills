#!/usr/bin/env node
// L-001: injected versus discovered skill delivery.
//
// One variable: whether the assigned skill bodies are part of the worker prompt. Everything else — model,
// fixture, task, acceptance, sandbox, request budget, tool set — is identical between arms.
//
//   node eval/harness/l001.mjs --out <dir>
//
// Caps are the authorization: 24 requests per arm, 48 total, $0.03 estimated. A run that cannot start
// because its arm is spent is recorded as `incomplete-budget`, never as a correctness failure.

import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkerInstructions, loadAssignedSkills, skillsFingerprint, estimatedTokens } from "../../bin/lib/skill-injection.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const SKILLS = join(REPO, "skills");
const SANDBOX = join(REPO, "eval/harness/sandbox.sh");
const PROXYCTL = join(REPO, "eval/harness/proxyctl.mjs");
const ROOT = "/home/sumeet/.tmp/l001";

const REQUEST_CAP_PER_ARM = 24;
const REQUEST_CAP_TOTAL = 48;
const COST_CAP = 0.03;
const RATES = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 };
const ARMS = {
  discovered: { port: 4331, delivery: false },
  injected: { port: 4332, delivery: true },
};
const SKILLS_BY_SCENARIO = { fix: ["prosci-fix"], arch: ["prosci-architect"], review: ["prosci-review"] };
const TASKS = {
  fix: "The test suite fails. Make it pass without weakening or deleting tests. You own src/ only.",
  arch: "Write an architecture decision record at docs/adr/0001-uploads.md choosing how uploaded files are processed. You own that file only.",
  review: "Review src/validate.mjs and write your verdict to docs/review.md. Do not modify src/.",
};

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const OUT = resolve(arg("out", join(ROOT, "out")));
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "raw"), { recursive: true });
mkdirSync(join(OUT, "runs"), { recursive: true });

const hashes = (dir) => {
  const rows = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else rows.push(`${p.slice(dir.length + 1)}\0${createHash("sha256").update(readFileSync(p)).digest("hex")}`);
    }
  };
  walk(dir);
  return createHash("sha256").update(rows.join("\n")).digest("hex").slice(0, 16);
};

// Fixtures are committed as plain files; the repository is recreated deterministically before a run.
function ensureRepo(dir) {
  if (existsSync(join(dir, ".git"))) return;
  const env = { ...process.env, GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" };
  const git = (...args) => execFileSync("git", args, { cwd: dir, env, stdio: "ignore" });
  git("init", "-q");
  git("config", "user.email", "eval@example.invalid");
  git("config", "user.name", "eval");
  git("add", "-A");
  git("commit", "-qm", "fixture");
}

const scenarios = Object.keys(TASKS).map((id) => {
  const fixture = join(REPO, `eval/fixtures/l001/${id}`);
  ensureRepo(fixture);
  return {
    id,
    fixture,
    base: execFileSync("git", ["rev-parse", "HEAD"], { cwd: fixture, encoding: "utf8" }).trim(),
    fixtureHash: hashes(fixture),
    skills: SKILLS_BY_SCENARIO[id],
    task: TASKS[id],
  };
});

const assigned = scenarios.flatMap((s) => loadAssignedSkills(SKILLS, s.skills));
const shared = loadAssignedSkills(SKILLS, ["prosci", "prosci-bar"]);
const fingerprint = skillsFingerprint([...assigned, ...shared]);
const config = {
  experiment: "L-001",
  frozenAt: new Date().toISOString(),
  model: "claude-haiku-5-5",
  thinking: "low",
  arms: Object.keys(ARMS),
  reps: 2,
  requestCapPerArm: REQUEST_CAP_PER_ARM,
  requestCapTotal: REQUEST_CAP_TOTAL,
  costCapUsd: COST_CAP,
  skillsFingerprint: fingerprint,
  scenarios,
};
const { frozenAt: _frozenAt, ...freezable } = config;
const configHash = createHash("sha256").update(JSON.stringify(freezable)).digest("hex").slice(0, 16);
writeFileSync(join(OUT, "config.json"), JSON.stringify({ ...config, configHash }, null, 2));
const frozenPath = join(OUT, "frozen.json");
if (existsSync(frozenPath)) {
  const frozen = JSON.parse(readFileSync(frozenPath, "utf8"));
  if (frozen.configHash !== configHash) throw new Error("scenarios, fixtures or skills changed after the freeze; refusing to run");
} else {
  writeFileSync(frozenPath, JSON.stringify({ configHash, frozenAt: config.frozenAt }, null, 2));
}

// --- workspace -------------------------------------------------------------------------------------
const WS = join(OUT, "ws");
for (const arm of Object.keys(ARMS)) {
  mkdirSync(join(WS, "home", arm, "agent", "skills"), { recursive: true });
  for (const name of readdirSync(SKILLS)) cpSync(join(SKILLS, name), join(WS, "home", arm, "agent", "skills", name), { recursive: true });
  mkdirSync(join(WS, "home", arm), { recursive: true });
  writeFileSync(join(WS, "home", arm, "agent", "auth.json"), JSON.stringify({ "l001-proxy": { type: "api_key", key: "sandbox-dummy-token" } }));
  writeFileSync(join(WS, "home", arm, "agent", "models.json"), JSON.stringify({
    providers: {
      "l001-proxy": {
        api: "anthropic-messages",
        baseUrl: `http://127.0.0.1:${ARMS[arm].port}/inference/go/anthropic`,
        apiKey: "sandbox-dummy-token",
        models: [{ id: "claude-haiku-5-5" }],
      },
    },
  }, null, 2));
}

// --- acceptance and adherence ----------------------------------------------------------------------
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const citationLines = (text, file) => [...text.matchAll(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(\\d+)`, "g"))].map((m) => Number(m[1]));

function evaluate(scenario, worktree) {
  const base = scenario.base;
  const changed = execFileSync("git", ["diff", "--name-only", base], { cwd: worktree, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  if (scenario.id === "fix") {
    let acceptance = false;
    try { execFileSync("node", ["--test"], { cwd: worktree, stdio: "ignore" }); acceptance = true; } catch {}
    const artifact = read(join(worktree, "src/sum.mjs")) ?? "";
    const quality = {
      scope: changed.every((f) => f.startsWith("src/")),
      testsUntouched: !changed.some((f) => f.startsWith("test/")),
    };
    return { acceptance, changed, artifact: artifact.slice(0, 400), quality, qualityScore: Object.values(quality).filter(Boolean).length };
  }
  if (scenario.id === "arch") {
    const text = read(join(worktree, "docs/adr/0001-uploads.md"));
    const options = /##+\s*(option|alternative)/i.test(text ?? "") || ((text ?? "").match(/^\s*\d+\.\s+\*\*/gm) ?? []).length >= 2;
    const decision = /##+\s*decision/i.test(text ?? "");
    const reversal = /revers/i.test(text ?? "");
    return { acceptance: Boolean(text && decision), changed, artifact: (text ?? "").slice(0, 800), quality: { options, decision, reversal }, qualityScore: [options, decision, reversal].filter(Boolean).length };
  }
  const text = read(join(worktree, "docs/review.md"));
  const cites = citationLines(text ?? "", "src/validate.mjs");
  const source = read(join(worktree, "src/validate.mjs")) ?? "";
  const defectCited = cites.some((n) => (source.split("\n")[n - 1] ?? "").includes("|| 10"));
  const verdict = /\b(pass|block|blocking|approve|reject)\b/i.test(text ?? "");
  const specific = /zero|\b0\b|falsy|fallback/i.test(text ?? "");
  return {
    acceptance: Boolean(text && cites.length > 0 && cites.every((n) => n >= 1 && n <= source.split("\n").length)),
    changed, artifact: (text ?? "").slice(0, 800), cites, defectCited,
    quality: { verdict, specific }, qualityScore: [verdict, specific].filter(Boolean).length,
  };
}

function adherence(scenario, worktree, events) {
  if (scenario.id === "fix") {
    const order = [];
    for (const e of events) {
      if (e.type !== "tool_execution_start") continue;
      const text = JSON.stringify(e.args ?? {});
      if (/test/i.test(text)) order.push("test");
      else if (["edit", "write", "apply_patch"].includes(e.toolName)) order.push("edit");
    }
    return { ok: order.includes("test") && order.indexOf("test") < order.indexOf("edit"), rule: "failing test reproduced before first edit", order };
  }
  const result = evaluate(scenario, worktree);
  if (scenario.id === "arch") return { ok: result.quality.options && result.quality.reversal, rule: "two options and a reversal cost", ...result.quality };
  return { ok: result.defectCited, rule: "cites the defective source line", cites: result.cites };
}

// --- model-free acceptance proof -------------------------------------------------------------------
function vacuities() {
  const out = {};
  for (const s of scenarios) {
    const pristine = join(WS, "vacuity", s.id);
    cpSync(s.fixture, pristine, { recursive: true });
    out[s.id] = { untouched: evaluate(s, pristine).acceptance };
    if (s.id === "fix") writeFileSync(join(pristine, "src/sum.mjs"), "export function sum(a, b) {\n  return a + b;\n}\n");
    if (s.id === "arch") {
      mkdirSync(join(pristine, "docs/adr"), { recursive: true });
      writeFileSync(join(pristine, "docs/adr/0001-uploads.md"), "## Option A: inline\n\n## Option B: queue\n\n## Decision\nUse the queue.\n\n## Reversal\nMove handling back inline.\n");
    }
    if (s.id === "review") {
      mkdirSync(join(pristine, "docs"), { recursive: true });
      writeFileSync(join(pristine, "docs/review.md"), "Blocking: src/validate.mjs:2 treats zero as falsy and falls back to 10.\n");
    }
    out[s.id].referenceAccepted = evaluate(s, pristine).acceptance;
  }
  return out;
}
const vacuity = vacuities();
if (!Object.values(vacuity).every((v) => v.untouched === false && v.referenceAccepted === true)) {
  throw new Error(`acceptance is not discriminating: ${JSON.stringify(vacuity)}`);
}
writeFileSync(join(OUT, "vacuity.json"), JSON.stringify(vacuity, null, 2));

// --- isolation -------------------------------------------------------------------------------------
const isolation = {};
for (const arm of Object.keys(ARMS)) {
  const ws = join(WS, "isolation", arm);
  const home = join(WS, "home", arm);
  const agent = join(home, "agent");
  mkdirSync(ws, { recursive: true });
  const verify = spawnSync("sh", [SANDBOX, "--verify", ws, home, agent], { encoding: "utf8" });
  const probes = ["/home/sumeet/.ssh/id_ed25519", "/home/sumeet/.aws/credentials", "/home/sumeet/.codex/auth.json", "/home/sumeet/.netrc", "/home/sumeet/.pi/agent/auth.json", "/home/sumeet/personal-repo/projects/prosci/AGENTS.md"]
    .map((p) => ({ path: p, state: spawnSync("sh", [SANDBOX, ws, home, agent, "sh", "-c", `cat '${p}' >/dev/null 2>&1 && echo READABLE || echo ABSENT`], { encoding: "utf8" }).stdout.trim() }));
  isolation[arm] = { verifyOk: verify.status === 0, probes, clean: verify.status === 0 && probes.every((p) => p.state === "ABSENT") };
  writeFileSync(join(OUT, `isolation-${arm}.txt`), verify.stdout + verify.stderr + "\n" + probes.map((p) => `${p.state} ${p.path}`).join("\n") + "\n");
}
if (!Object.values(isolation).every((i) => i.clean)) throw new Error("isolation failed; series not started");

// --- proxies ---------------------------------------------------------------------------------------
const identity = {};
for (const [arm, cfg] of Object.entries(ARMS)) {
  const dir = join(OUT, arm);
  mkdirSync(dir, { recursive: true });
  const budgetFile = join(dir, "budget.json");
  if (!existsSync(budgetFile)) writeFileSync(budgetFile, JSON.stringify({ schema: 1, limit: REQUEST_CAP_PER_ARM, used: 0 }));
  const started = JSON.parse(execFileSync("node", [PROXYCTL, "start",
    "--port", String(cfg.port), "--pid-file", join(dir, "proxy.pid"),
    "--execution-id", `l001-${arm}`, "--plan-hash", configHash,
    "--budget-file", budgetFile, "--access-log", join(dir, "access.jsonl"),
    "--models", "claude-haiku-5-5", "--max-requests", String(REQUEST_CAP_PER_ARM),
  ], { encoding: "utf8" }));
  if (started.identity.executionId !== `l001-${arm}` || !(started.identity.models ?? []).includes("claude-haiku-5-5")) {
    throw new Error(`proxy identity mismatch for ${arm}: ${JSON.stringify(started.identity)}`);
  }
  identity[arm] = started.identity;
}

const usage = () => Object.fromEntries(Object.keys(ARMS).map((arm) => {
  const p = join(OUT, arm, "budget.json");
  const b = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { used: 0, limit: REQUEST_CAP_PER_ARM };
  return [arm, b];
}));
const spent = () => Object.values(usage()).reduce((n, b) => n + b.used, 0);

// --- runs ------------------------------------------------------------------------------------------
const runs = [];
const runPath = (arm, scenario, rep) => join(OUT, arm, `${scenario}-r${rep}`);
const cost = (u) => ((u?.input ?? 0) * RATES.input + (u?.output ?? 0) * RATES.output + (u?.cacheRead ?? 0) * RATES.cacheRead + (u?.cacheWrite ?? 0) * RATES.cacheWrite) / 1e6;

function execute(arm, scenario, rep) {
  mkdirSync(join(WS, "run"), { recursive: true });
  const id = `${arm}-${scenario.id}-r${rep}`;
  const budgets = usage();
  if (budgets[arm].used >= REQUEST_CAP_PER_ARM || spent() >= REQUEST_CAP_TOTAL) {
    return { id, arm, scenario: scenario.id, rep, status: "incomplete-budget", requestsUsed: budgets[arm].used };
  }
  const worktree = join(WS, "run", id);
  cpSync(scenario.fixture, worktree, { recursive: true });

  const skillObjs = loadAssignedSkills(SKILLS, scenario.skills);
  const handoff = `# Handoff: ${id}\n\nGoal: ${scenario.task}\n\n## Files you own\n${scenario.id === "fix" ? "- src/" : scenario.id === "arch" ? "- docs/adr/0001-uploads.md" : "- docs/review.md"}\n\n## Acceptance\n${scenario.id === "fix" ? "- node --test passes" : scenario.id === "arch" ? "- the ADR is written" : "- the review cites src/validate.mjs"}\n`;
  const bundle = buildWorkerInstructions({
    unit: { id, role: "implementer", files: [scenario.id === "fix" ? "src/" : scenario.id === "arch" ? "docs/adr/0001-uploads.md" : "docs/review.md"] },
    role: { write: true }, handoff, shared, skills: skillObjs,
  });
  const prompt = ARMS[arm].delivery ? bundle.text : handoff;
  const delivered = ARMS[arm].delivery && prompt.includes(skillObjs[0].body.trim());
  if (ARMS[arm].delivery && !delivered) throw new Error(`injection was not delivered for ${id}`);
  mkdirSync(join(OUT, "instructions"), { recursive: true });
  writeFileSync(join(OUT, "instructions", `${id}.md`), prompt);

  const authPath = join(OUT, "auth", `${id}.json`);
  mkdirSync(dirname(authPath), { recursive: true });
  if (existsSync(authPath)) throw new Error(`authorization for ${id} was already used`);
  writeFileSync(authPath, JSON.stringify({ id, singleUse: true, executions: 1, configHash, base: scenario.base, fixtureHash: scenario.fixtureHash, skillsFingerprint: fingerprint, maxRequests: REQUEST_CAP_PER_ARM }, null, 2));

  const budgetBefore = usage()[arm].used;
  const startedAt = Date.now();
  const startedMono = Number(process.hrtime.bigint() / 1000000n);
  const skillPath = join(WS, "home", arm, "agent", "skills", scenario.skills[0]);
  const run = spawnSync("sh", [SANDBOX, worktree, join(WS, "home", arm), join(WS, "home", arm, "agent"),
    "pi", "-p", "--mode", "json", "--model", "l001-proxy/claude-haiku-5-5", "--thinking", "low",
    "--skill", skillPath, prompt,
  ], { encoding: "utf8", timeout: 240000 });
  const finishedMono = Number(process.hrtime.bigint() / 1000000n);
  writeFileSync(join(OUT, "raw", `${id}.jsonl`), run.stdout ?? "");
  writeFileSync(join(OUT, "raw", `${id}.err`), run.stderr ?? "");
  const events = (run.stdout ?? "").split("\n").filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const assistant = events.filter((e) => e.type === "message_end" && e.message?.role === "assistant").map((e) => e.message);
  const u = assistant.at(-1)?.usage ?? {};
  const requests = usage()[arm].used - budgetBefore;
  const result = evaluate(scenario, worktree);
  const adh = adherence(scenario, worktree, events);
  const budgetHit = events.some((e) => String(e.errorMessage ?? e.finalError ?? "").includes("request budget exhausted"));
  const status = budgetHit ? "incomplete-budget" : run.status === 0 ? "ok" : "failed";
  return {
    id, arm, scenario: scenario.id, rep, status,
    delivered, instructionBytes: Buffer.byteLength(prompt), instructionTokens: estimatedTokens(prompt),
    model: [...new Set(assistant.map((a) => `${a.provider}/${a.model}`))],
    acceptance: result.acceptance, changed: result.changed, adherence: adh,
    qualityScore: result.qualityScore, quality: result.quality,
    usage: u, requestsUsed: requests, requestsAfter: usage()[arm].used,
    wallMs: Date.now() - startedAt, monoMs: finishedMono - startedMono,
    costUsd: cost(u), artifact: result.artifact, exit: run.status,
  };
}

for (let rep = 1; rep <= config.reps; rep += 1) {
  for (const scenario of scenarios) {
    for (const arm of config.arms) {
      const record = execute(arm, scenario, rep);
      runs.push(record);
      writeFileSync(join(OUT, "runs", `${record.id}.json`), JSON.stringify(record, null, 2));
    }
  }
}

// --- summary ---------------------------------------------------------------------------------------
const armSummary = (arm) => {
  const rs = runs.filter((r) => r.arm === arm);
  const completed = rs.filter((r) => r.status === "ok");
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    runs: rs.length, completed: completed.length,
    incompleteBudget: rs.filter((r) => r.status === "incomplete-budget").length,
    acceptance: completed.filter((r) => r.acceptance).length,
    adherence: completed.filter((r) => r.adherence.ok).length,
    qualityMean: mean(completed.map((r) => r.qualityScore)),
    inputTokens: completed.reduce((n, r) => n + (r.usage?.input ?? 0) + (r.usage?.cacheRead ?? 0) + (r.usage?.cacheWrite ?? 0), 0),
    outputTokens: completed.reduce((n, r) => n + (r.usage?.output ?? 0), 0),
    instructionTokensMean: mean(rs.map((r) => r.instructionTokens)),
    requests: rs.reduce((n, r) => n + (r.requestsUsed ?? 0), 0),
    costUsd: rs.reduce((n, r) => n + (r.costUsd ?? 0), 0),
  };
};
const summary = {
  configHash, fingerprint, finishedAt: new Date().toISOString(),
  budgets: usage(), totalRequests: spent(),
  costEstimateUsd: runs.reduce((n, r) => n + (r.costUsd ?? 0), 0),
  costWithinCap: runs.reduce((n, r) => n + (r.costUsd ?? 0), 0) <= COST_CAP,
  arms: { discovered: armSummary("discovered"), injected: armSummary("injected") },
  runs,
};
writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));

for (const [arm] of Object.entries(ARMS)) {
  try { execFileSync("node", [PROXYCTL, "stop", "--pid-file", join(OUT, arm, "proxy.pid")], { encoding: "utf8" }); } catch (e) { console.error(`stop ${arm}: ${e.message}`); }
}
console.log(JSON.stringify({ ok: true, configHash, totalRequests: spent(), cost: summary.costEstimateUsd, arms: summary.arms }, null, 2));
