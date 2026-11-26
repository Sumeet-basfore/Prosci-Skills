#!/usr/bin/env node
// Recompute the L-001 summary from the run records that were actually paid for.
//
// Two corrections live here, both scoring-only and model-free:
//   - a run whose transcript ends in a proxy 429 is `incomplete-budget`, not a correctness failure;
//   - adherence for the fix scenario reads `tool_execution_start.args`, because the assistant message's
//     tool-call parts do not carry arguments in Pi's JSONL.
// A run never started because the aggregate cap was reached is recorded explicitly.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const OUT = resolve(arg("out", "eval/reports/l001"));
const WS = join(OUT, "ws", "run");
const COST_CAP = 0.03;

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const events = (id) => (read(join(OUT, "raw", `${id}.jsonl`)) ?? "").split("\n").filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const records = readdirSync(join(OUT, "runs")).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(OUT, "runs", f), "utf8")));

const citationLines = (text, file) => [...text.matchAll(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(\\d+)`, "g"))].map((m) => Number(m[1]));

function evaluate(id, scenario, worktree) {
  const base = scenario.base;
  const changed = execFileSync("git", ["diff", "--name-only", base], { cwd: worktree, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  if (scenario.id === "fix") {
    let acceptance = false;
    try { execFileSync("node", ["--test"], { cwd: worktree, stdio: "ignore" }); acceptance = true; } catch {}
    const quality = { scope: changed.every((f) => f.startsWith("src/")), testsUntouched: !changed.some((f) => f.startsWith("test/")) };
    return { acceptance, changed, quality, qualityScore: Object.values(quality).filter(Boolean).length };
  }
  if (scenario.id === "arch") {
    const text = read(join(worktree, "docs/adr/0001-uploads.md"));
    const options = /##+\s*(option|alternative)/i.test(text ?? "") || ((text ?? "").match(/^\s*\d+\.\s+\*\*/gm) ?? []).length >= 2;
    const decision = /##+\s*decision/i.test(text ?? "");
    const reversal = /revers/i.test(text ?? "");
    return { acceptance: Boolean(text && decision), changed, quality: { options, decision, reversal }, qualityScore: [options, decision, reversal].filter(Boolean).length };
  }
  const text = read(join(worktree, "docs/review.md"));
  const cites = citationLines(text ?? "", "src/validate.mjs");
  const source = read(join(worktree, "src/validate.mjs")) ?? "";
  const defectCited = cites.some((n) => (source.split("\n")[n - 1] ?? "").includes("|| 10"));
  const verdict = /\b(pass|block|blocking|approve|reject)\b/i.test(text ?? "");
  const specific = /zero|\b0\b|falsy|fallback/i.test(text ?? "");
  return {
    acceptance: Boolean(text && cites.length > 0 && cites.every((n) => n >= 1 && n <= source.split("\n").length)),
    changed, cites, defectCited, quality: { verdict, specific }, qualityScore: [verdict, specific].filter(Boolean).length,
  };
}

function fixAdherence(id) {
  const order = [];
  for (const e of events(id)) {
    if (e.type !== "tool_execution_start") continue;
    const text = JSON.stringify(e.args ?? {});
    if (/test/i.test(text)) order.push("test");
    else if (["edit", "write", "apply_patch"].includes(e.toolName)) order.push("edit");
  }
  return { ok: order.includes("test") && order.indexOf("test") < order.indexOf("edit"), rule: "failing test reproduced before first edit", order };
}

const exhausted = (id) => events(id).some((e) => String(e.errorMessage ?? e.finalError ?? "").includes("request budget exhausted"));

const scenarios = JSON.parse(read(join(OUT, "config.json"))).scenarios;
const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));

const runs = records.map((r) => {
  const worktree = join(WS, r.id);
  const result = existsSync(worktree) ? evaluate(r.id, byId[r.scenario], worktree) : null;
  const budgetHit = exhausted(r.id) || (r.status === "ok" && r.usage && (r.usage.totalTokens ?? 0) === 0 && r.acceptance === false && r.requestsAfter >= 24);
  const status = budgetHit ? "incomplete-budget" : r.status;
  const adh = r.scenario === "fix" ? fixAdherence(r.id) : {
    ok: r.scenario === "arch" ? Boolean(result?.quality.options && result?.quality.reversal) : Boolean(result?.defectCited),
    rule: r.scenario === "arch" ? "two options and a reversal cost" : "cites the defective source line",
  };
  return {
    ...r,
    status,
    acceptance: status === "ok" ? result?.acceptance ?? false : null,
    quality: status === "ok" ? result?.quality ?? null : null,
    qualityScore: status === "ok" ? result?.qualityScore ?? 0 : null,
    adherence: status === "ok" ? adh : { ok: null, rule: adh.rule, reason: "incomplete run is not scored" },
  };
});

// The run the aggregate cap prevented from starting.
if (!runs.some((r) => r.id === "injected-review-r2")) {
  runs.push({
    id: "injected-review-r2", arm: "injected", scenario: "review", rep: 2,
    status: "incomplete-budget", requestsUsed: 0, requestsAfter: 24, usage: null, costUsd: 0,
    acceptance: null, adherence: { ok: null, rule: "not scored" }, qualityScore: null,
    note: "aggregate cap of 48 requests was reached before this run could start",
  });
}

const arm = (name) => {
  const rs = runs.filter((r) => r.arm === name);
  const ok = rs.filter((r) => r.status === "ok");
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    started: rs.length,
    completed: ok.length,
    incompleteBudget: rs.filter((r) => r.status === "incomplete-budget").length,
    acceptance: ok.filter((r) => r.acceptance).length,
    adherence: ok.filter((r) => r.adherence.ok).length,
    qualityMean: mean(ok.map((r) => r.qualityScore)),
    inputTokens: ok.reduce((n, r) => n + (r.usage?.input ?? 0) + (r.usage?.cacheRead ?? 0) + (r.usage?.cacheWrite ?? 0), 0),
    outputTokens: ok.reduce((n, r) => n + (r.usage?.output ?? 0), 0),
    instructionTokensMean: mean(rs.map((r) => r.instructionTokens).filter((n) => Number.isFinite(n))),
    requests: rs.reduce((n, r) => n + (r.requestsUsed ?? 0), 0),
    costUsd: rs.reduce((n, r) => n + (r.costUsd ?? 0), 0),
  };
};
const total = runs.reduce((n, r) => n + r.costUsd, 0);
const summary = {
  experiment: "L-001", classifiedAt: new Date().toISOString(),
  configHash: JSON.parse(read(join(OUT, "config.json"))).configHash,
  fingerprint: JSON.parse(read(join(OUT, "config.json"))).skillsFingerprint,
  budgets: Object.fromEntries(readdirSync(OUT).filter((d) => existsSync(join(OUT, d, "budget.json"))).map((d) => [d, JSON.parse(read(join(OUT, d, "budget.json")))])),
  totalRequests: runs.reduce((n, r) => n + (r.requestsUsed ?? 0), 0),
  costEstimateUsd: total, costWithinCap: total <= COST_CAP,
  arms: { discovered: arm("discovered"), injected: arm("injected") },
  runs,
};
writeFileSync(join(OUT, "summary-classified.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ arms: summary.arms, runs: runs.map((r) => `${r.id} ${r.status} req=${r.requestsUsed} acc=${r.acceptance} adh=${r.adherence.ok} q=${r.qualityScore}`), cost: total }, null, 2));
