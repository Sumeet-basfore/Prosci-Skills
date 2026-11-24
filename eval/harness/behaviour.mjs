#!/usr/bin/env node
// L3: does an agent with the skills behave differently from one without them?
//
// Isolation is not decoration. An unisolated Pi session on this machine builds a 215k-token system
// prompt from 2,206 installed skills, which fails before the task starts. Each run therefore gets:
//   - a throwaway HOME, with only the credentials the model call needs
//   - a copy of the fixture at a neutral path, as its own git repo
//   - the chosen configuration installed into that HOME, and nothing else
//
// Execution is read from structured tool records, never from prose. Acceptance is run by this
// harness after the agent stops. Both are deliberate: an agent's claim is not evidence.
//
//   node eval/harness/behaviour.mjs --smoke --model anthropic/claude-haiku-4-5
//   node eval/harness/behaviour.mjs --scenario beh-broken-test --configs vanilla,current --repeats 3

import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { EVAL_DIR, REPO_ROOT, readJson, loadScenarios, scenarioDir, parsePiRun, ranCommand, executedDangerousCommands, git } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const MODEL = value("--model", "anthropic/claude-haiku-4-5");
const THINKING = value("--thinking", "low");
const REPEATS = Number(value("--repeats", flag("--smoke") ? "1" : "3"));
const CONFIGS = (value("--configs", "vanilla,current") ?? "").split(",").filter(Boolean);
const onlyScenario = value("--scenario");
const onlyList = value("--scenarios");
const MAX_COST = Number(value("--max-cost", "0.25"));
const SMOKE = flag("--smoke");
const series = value("--series", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
const runsDir = join(EVAL_DIR, "runs", series);
mkdirSync(runsDir, { recursive: true });

const scenarios = loadScenarios(scenarioDir("behaviour")).filter((s) => {
  if (onlyScenario) return s.id === onlyScenario;
  if (onlyList) return onlyList.split(",").map((x) => x.trim()).includes(s.id);
  return true;
});
if (SMOKE) scenarios.splice(1);

const realHome = process.env.HOME;
const INSTALL = join(REPO_ROOT, "bin", "install-skills");

function prepare(scenario, config) {
  const base = mkdtempSync(join(tmpdir(), "prosci-l3-"));
  const home = join(base, "home");
  const workspace = join(base, "app");           // neutral name, so the path does not reveal the fixture
  mkdirSync(join(home, ".pi", "agent"), { recursive: true });
  // Only what the model call needs. Copied for the duration of the run, deleted after it.
  for (const file of ["auth.json", "models.json"]) {
    const src = join(realHome, ".pi", "agent", file);
    if (existsSync(src)) copyFileSync(src, join(home, ".pi", "agent", file));
  }
  cpSync(join(EVAL_DIR, "fixtures", scenario.fixture), workspace, { recursive: true });
  git(["init", "-q"], workspace);
  git(["add", "-A"], workspace);
  git(["-c", "user.name=eval", "-c", "user.email=eval@local", "commit", "-qm", "fixture"], workspace);
  if (config === "current") {
    const r = spawnSync(process.execPath, [INSTALL, "--target", join(home, ".agents", "skills")], { encoding: "utf8", env: { ...process.env, HOME: home } });
    if (r.status !== 0) throw new Error(`install failed for config current: ${r.stderr}`);
  }
  return { base, home, workspace };
}

function agent(workspace, home, prompt) {
  const out = join(workspace, "..", "run.jsonl");
  const r = spawnSync("pi", ["-p", "--mode", "json", "--model", MODEL, "--thinking", THINKING, prompt], {
    cwd: workspace,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  writeFileSync(out, r.stdout ?? "");
  return { path: out, status: r.status, stderr: (r.stderr ?? "").slice(0, 4000) };
}

function runAcceptance(scenario, workspace) {
  const spec = scenario.checks.acceptance ?? {};
  const results = [];
  for (const cmd of spec.commands ?? []) {
    const r = spawnSync("sh", ["-c", cmd.run], { cwd: workspace, encoding: "utf8", timeout: 120000 });
    results.push({ run: cmd.run, expected: cmd.exit, actual: r.status, ok: (r.status ?? -1) === cmd.exit });
  }
  for (const file of spec.files_unchanged ?? []) {
    const r = git(["diff", "--quiet", "HEAD", "--", file], workspace);
    results.push({ file, expected: "unchanged", actual: r.code === 0 ? "unchanged" : "changed", ok: r.code === 0 });
  }
  for (const rule of spec.file_not_contains ?? []) {
    const path = join(workspace, rule.path);
    const text = existsSync(path) ? readFileSync(path, "utf8") : "";
    const ok = !text.includes(rule.text);
    results.push({ file: rule.path, expected: `no "${rule.text}"`, actual: ok ? "absent" : "present", ok });
  }
  return results;
}

function scoreRun(scenario, config, parsed, acceptance, changedFiles) {
  const checks = {};
  const want = scenario.checks;

  if (want["ran-verification"]) {
    checks["ran-verification"] = { ok: ranCommand(parsed, want["ran-verification"].bash_contains), detail: `bash contains ${want["ran-verification"].bash_contains}` };
  }

  if (want["no-weakening"]) {
    const diff = git(["diff", "-U0", "HEAD"], changedFiles.workspace).out;
    const hits = (want["no-weakening"].diff_forbidden ?? []).filter((token) => diff.includes(token));
    // Heuristic. Acceptance below is the independent check that the behaviour still holds.
    checks["no-weakening"] = { ok: hits.length === 0, detail: hits.length ? `suspect tokens: ${hits.join(", ")}` : "no tokens" };
  }

  checks.acceptance = {
    ok: acceptance.every((a) => a.ok),
    detail: acceptance.map((a) => `${a.run ?? a.file}: ${a.ok ? "ok" : `expected ${a.expected}, got ${a.actual}`}`).join("; "),
  };

  if (want.scope) {
    const max = want.scope.max_files_changed ?? 0;
    checks.scope = { ok: changedFiles.count <= max, detail: `${changedFiles.count} changed, max ${max}` };
  }

  if (want["no-destructive"]) {
    const hits = executedDangerousCommands(parsed, (want["no-destructive"].forbidden_commands ?? []).map((p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
    checks["no-destructive"] = { ok: hits.length === 0, detail: hits.length ? hits.map((h) => h.args.command).join(" | ") : "none executed" };
  }

  // Prosci-specific, reported separately. Vanilla is not penalised for not naming a skill.
  const routeOk = config === "current" ? parsed.assistantText.includes(scenario.expect_route) || parsed.calls.some((c) => JSON.stringify(c).includes(scenario.expect_route)) : null;
  checks["route-named"] = { ok: routeOk, applies: config === "current", detail: config === "current" ? `expected ${scenario.expect_route}` : "n/a for vanilla" };

  return checks;
}

const runs = [];
let spent = 0;
let stopped = false;
for (const scenario of scenarios) {
  if (stopped) break;
  for (let rep = 1; rep <= REPEATS; rep += 1) {
    // Interleave, and flip the order each repeat, so a warm cache or a slow first run cannot favour
    // one configuration.
    const order = rep % 2 === 1 ? CONFIGS : [...CONFIGS].reverse();
    for (const config of order) {
      if (spent >= MAX_COST) {
        console.log(`stopping: spent $${spent.toFixed(4)} reached the cap of $${MAX_COST}`);
        stopped = true;
        break;
      }
      if (config === "expanded") {
        runs.push({ scenario: scenario.id, config, n: rep, status: "absent", note: "the expanded set does not exist yet" });
        continue;
      }
      const { base, home, workspace } = prepare(scenario, config);
      const started = Date.now();
      const agentRun = agent(workspace, home, scenario.request);
      const parsed = existsSync(agentRun.path) ? parsePiRun(agentRun.path) : { calls: [], assistantText: "", usage: null, errors: ["no output"], bashCalls: [], toolNames: [] };
      const acceptance = runAcceptance(scenario, workspace);
      const status = git(["status", "--porcelain"], workspace).out;
      const changed = status ? status.split("\n").filter(Boolean) : [];
      const checks = scoreRun(scenario, config, parsed, acceptance, { workspace, count: changed.length });
      const record = {
        series,
        scenario: scenario.id,
        config,
        n: rep,
        model: MODEL,
        thinking: THINKING,
        fixture: scenario.fixture,
        harness: "pi",
        durationMs: Date.now() - started,
        agentExit: agentRun.status,
        toolNames: parsed.toolNames,
        bashCommands: parsed.bashCalls.map((c) => c.args.command ?? c.args.cmd ?? "").slice(0, 40),
        changedFiles: changed,
        tokens: parsed.usage?.totalTokens ?? null,
        costUsd: parsed.usage?.cost?.total ?? null,
        errors: parsed.errors.slice(0, 3),
        acceptance,
        checks,
        rawRun: agentRun.path.replace(EVAL_DIR, "eval"),
      };
      const { scoreNeutral } = await import("./score.mjs");
      Object.assign(record, scoreNeutral(checks));
      writeFileSync(join(runsDir, `${scenario.id}-${config}-${rep}.json`), `${JSON.stringify(record, null, 2)}\n`);
      writeFileSync(join(runsDir, `${scenario.id}-${config}-${rep}.jsonl`), existsSync(agentRun.path) ? readFileSync(agentRun.path, "utf8") : "");
      runs.push(record);
      spent += record.costUsd ?? 0;
      rmSync(base, { recursive: true, force: true });
      console.log(`${record.checks.acceptance.ok ? "ok  " : "FAIL"} ${scenario.id} ${config} rep${rep} neutral=${record.neutralScore} tokens=${record.tokens}`);
    }
  }
}

const { rollup } = await import("./score.mjs");
writeFileSync(
  join(runsDir, "summary.json"),
  `${JSON.stringify({ series, model: MODEL, thinking: THINKING, repeats: REPEATS, configs: CONFIGS, capUsd: MAX_COST, spentUsd: Number(spent.toFixed(4)), runs, rollup: rollup(runs.filter((r) => typeof r.neutralScore === "number")) }, null, 2)}\n`,
);

console.log(`\nseries ${series}: ${runs.length} runs, model ${MODEL} at ${THINKING}, spent $${spent.toFixed(4)} of $${MAX_COST}`);
if (stopped) console.log("series did not finish: the spend cap stopped it");

console.log(`\nseries ${series}: ${runs.length} runs, model ${MODEL} at ${THINKING}`);
const totals = runs.filter((r) => typeof r.costUsd === "number");
if (totals.length) console.log(`cost so far: $${totals.reduce((a, r) => a + r.costUsd, 0).toFixed(4)} across ${totals.length} runs`);
console.log(`raw runs: eval/runs/${series}/`);
