#!/usr/bin/env node
// Audit a completed L3 series for the things a score cannot tell you: was the model really the one
// named, did the skills really load, did credentials stay out of the agent's workspace, was the
// acceptance check able to fail, and what did it cost.
//
//   node eval/harness/audit.mjs --series smoke-haiku-5-5

import { readFileSync, existsSync, readdirSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { EVAL_DIR, parsePiRun, loadScenarios, scenarioDir } from "./lib.mjs";

const args = process.argv.slice(2);
const series = args[args.indexOf("--series") + 1];
if (!series) {
  console.error("usage: node eval/harness/audit.mjs --series <name>");
  process.exit(2);
}
const dir = join(EVAL_DIR, "runs", series);
const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });

// 1. Model availability: every run used the model the series claims, with no API error.
const models = new Set();
const apiErrors = [];
for (const run of summary.runs) {
  const file = join(dir, `${run.scenario}-${run.config}-${run.n}.jsonl`);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type === "message_end" && e.message?.role === "assistant") {
      if (e.message.model) models.add(e.message.model);
      if (e.message.errorMessage) apiErrors.push(e.message.errorMessage.slice(0, 120));
    }
  }
}
add("model availability", models.size === 1 && models.has(summary.model.split("/").pop()) && apiErrors.length === 0,
  `models=${[...models].join(",") || "none"} errors=${apiErrors.length}${apiErrors[0] ? ` first=${apiErrors[0]}` : ""}`);

// 2. Skill discovery: the nine load under current and never under vanilla.
let discoveryOk = true;
const discovery = [];
for (const run of summary.runs) {
  const file = join(dir, `${run.scenario}-${run.config}-${run.n}.jsonl`);
  if (!existsSync(file)) continue;
  let names = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type === "message_end" && e.message?.role === "system") {
      const skills = e.message.sections?.skills ?? "";
      names = [...skills.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]);
      break;
    }
  }
  const prosci = names.filter((n) => n.startsWith("prosci")).length;
  const expected = run.config === "current" ? 9 : 0;
  if (prosci !== expected) discoveryOk = false;
  discovery.push(`${run.config}:${names.length} skills, ${prosci} prosci`);
}
add("skill discovery", discoveryOk, discovery.slice(0, 4).join(" | "));

// 3. Invocation: reported, not scored. Did the current config name or read its route.
const invoked = summary.runs.filter((r) => r.config === "current" && r.checks?.["route-named"]?.ok).length;
const currentRuns = summary.runs.filter((r) => r.config === "current").length;
add("invocation (informational)", true, `${invoked}/${currentRuns} current runs named or loaded their route`);

// 4. Credential isolation: no run touched auth.json, and no agent command left the workspace.
const cwdLeaks = [];
const authTouches = [];
for (const run of summary.runs) {
  for (const cmd of run.bashCommands ?? []) {
    if (/auth\.json|\.pi\/agent/.test(cmd)) authTouches.push(cmd.slice(0, 60));
    if (/\/home\/sumeet/.test(cmd)) cwdLeaks.push(cmd.slice(0, 60));
  }
}
const tempLeft = readdirSync(tmpdir()).filter((n) => n.startsWith("prosci-l3-")).length;
add("credential isolation", authTouches.length === 0 && cwdLeaks.length === 0 && tempLeft === 0,
  `auth touches=${authTouches.length} home paths=${cwdLeaks.length} temp dirs left=${tempLeft}`);

// 5. Scoring integrity: acceptance must be able to fail. Run it against the untouched fixture.
const scenarioId = summary.runs[0]?.scenario;
const scenario = loadScenarios(scenarioDir("behaviour")).find((s) => s.id === scenarioId);
let integrity = { ok: false, detail: "no scenario" };
if (scenario) {
  const tmp = mkdtempSync(join(tmpdir(), "prosci-audit-"));
  const ws = join(tmp, "app");
  cpSync(join(EVAL_DIR, "fixtures", scenario.fixture), ws, { recursive: true });
  const untouched = (scenario.checks.acceptance?.commands ?? []).map((c) => {
    const r = spawnSync("sh", ["-c", c.run], { cwd: ws, encoding: "utf8", timeout: 60000 });
    return { run: c.run, expected: c.exit, actual: r.status };
  });
  rmSync(tmp, { recursive: true, force: true });
  const discriminates = untouched.some((u) => (u.actual ?? -1) !== u.expected);
  integrity = {
    ok: discriminates,
    detail: `${scenario.fixture} untouched: ${untouched.map((u) => `${u.run} exit ${u.actual} (want ${u.expected})`).join("; ")}`,
  };
}
add("scoring integrity (acceptance can fail)", integrity.ok, integrity.detail);

// 6. Cost.
const cost = summary.runs.reduce((a, r) => a + (r.costUsd ?? 0), 0);
add("cost within cap", cost <= (summary.capUsd ?? 0.25), `spent $${cost.toFixed(4)} of $${(summary.capUsd ?? 0.25).toFixed(2)}, ${summary.runs.length} runs`);

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name.padEnd(36)} ${c.detail}`);
const failed = checks.filter((c) => !c.ok && c.name !== "invocation (informational)");
console.log(`\n${checks.length - failed.length}/${checks.length} checks pass`);
process.exit(failed.length ? 1 : 0);
