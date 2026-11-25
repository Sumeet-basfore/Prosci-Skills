#!/usr/bin/env node
// Validate hard scenarios deterministically, with no model and no cost.
//
// For every scenario in the layer:
//   1. acceptance MUST fail on the untouched fixture, or the scenario measures nothing
//   2. acceptance MUST pass after applying the scenario's reference_fix
// It also asserts the fixture names none of the answer material.

import { mkdtempSync, cpSync, rmSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { EVAL_DIR, loadScenarios, scenarioDir, replyMatches } from "./lib.mjs";

const layer = process.argv.includes("--layer") ? process.argv[process.argv.indexOf("--layer") + 1] : "hard";
// Synthetic fixtures must not name the project at all. Calibrated fixtures are copies of real work
// and do contain it, so they declare the terms that would give the answer away instead.
function leakCheck(scenario) {
  if (scenario.leak_terms?.length) return new RegExp(scenario.leak_terms.join("|"), "i");
  return /prosci|expected|acceptance|reference_fix|eval\//i;
}

function runAcceptance(scenario, workspace) {
  const spec = scenario.checks?.acceptance ?? {};
  const results = [];
  for (const cmd of spec.commands ?? []) {
    const r = spawnSync("sh", ["-c", cmd.run], { cwd: workspace, encoding: "utf8", timeout: 120000, env: { ...process.env, EVAL_DIR } });
    results.push({ run: cmd.run, ok: (r.status ?? -1) === cmd.exit, actual: r.status, expected: cmd.exit });
  }
  for (const file of spec.files_changed ?? []) {
    const pristine = join(EVAL_DIR, "fixtures", scenario.fixture, file);
    const current = join(workspace, file);
    const differs = !existsSync(pristine) ? existsSync(current) : !existsSync(current) || readFileSync(pristine, "utf8") !== readFileSync(current, "utf8");
    results.push({ run: `changed ${file}`, ok: differs, actual: differs ? "changed" : "unchanged", expected: "changed" });
  }
  for (const file of spec.files_unchanged ?? []) {
    // Compared against the pristine fixture instead of a git baseline, which is equivalent and cheaper.
    const pristine = join(EVAL_DIR, "fixtures", scenario.fixture, file);
    const current = join(workspace, file);
    const same = existsSync(pristine) && existsSync(current) && readFileSync(pristine, "utf8") === readFileSync(current, "utf8");
    results.push({ run: `unchanged ${file}`, ok: same, actual: same ? "unchanged" : "changed", expected: "unchanged" });
  }
  for (const rule of spec.file_not_contains ?? []) {
    const path = join(workspace, rule.path);
    const ok = existsSync(path) && !readFileSync(path, "utf8").includes(rule.text);
    results.push({ run: `absent ${rule.text}`, ok, actual: ok ? "absent" : "present", expected: "absent" });
  }
  return results;
}

let failures = 0;
for (const scenario of loadScenarios(scenarioDir(layer))) {
  const fixture = join(EVAL_DIR, "fixtures", scenario.fixture);

  // 3. no answer leakage in the fixture files, walked recursively
  const leaks = [];
  const walk = (dir, prefix = "") => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (!/\.(png|jpg|json)$/i.test(entry.name)) {
        if (leakCheck(scenario).test(readFileSync(join(dir, entry.name), "utf8"))) leaks.push(rel);
      }
    }
  };
  walk(fixture);

  // Acceptance can inspect git history, so each copy is committed like a real run's workspace.
  const commitCopy = (dir) => {
    for (const args of [["init", "-q"], ["add", "-A"], ["-c", "user.name=eval", "-c", "user.email=e@l", "commit", "-qm", "fixture"]]) {
      spawnSync("git", args, { cwd: dir });
    }
  };

  // 1. untouched must fail
  const before = mkdtempSync(join(tmpdir(), "prosci-validate-"));
  cpSync(fixture, before, { recursive: true });
  commitCopy(before);
  const untouched = runAcceptance(scenario, before);
  // A reply-based assertion cannot fail "on the fixture": nothing is written. Validate the assertion
  // itself instead — it must match a reference reply and must not match a bland approval.
  let replyValid = null;
  if (scenario.reply_contains?.length && scenario.reference_reply) {
    const good = replyMatches(scenario.reference_reply, scenario.reply_contains);
    const bad = replyMatches("Looks good to me. The plan is fine, ship it.", scenario.reply_contains);
    replyValid = good.every((r) => r.ok) && bad.some((r) => !r.ok);
    if (!good.every((r) => r.ok)) leaks.push(`reply assertion does not match its own reference: ${good.filter((r) => !r.ok).map((r) => r.pattern).join(", ")}`);
    if (!bad.some((r) => !r.ok)) leaks.push("reply assertion passes on a bland approval, so it cannot detect a missed defect");
  }

  // A safety scenario protects a resource; it has nothing to fail before the change. Any scenario that
  // opts out must say why, and the reason is printed, so the exception cannot hide.
  const exempt = scenario.expect_untouched_failure === false;
  const failsUntouched = replyValid !== null ? replyValid : exempt ? Boolean(scenario.reason) : untouched.some((r) => !r.ok);
  rmSync(before, { recursive: true, force: true });

  // 2. reference fix must pass
  const after = mkdtempSync(join(tmpdir(), "prosci-validate-"));
  cpSync(fixture, after, { recursive: true });
  commitCopy(after);
  for (const cmd of scenario.reference_fix ?? []) {
    const r = spawnSync("sh", ["-c", cmd], { cwd: after, encoding: "utf8", env: { ...process.env, EVAL_DIR } });
    if (r.status !== 0) leaks.push(`reference_fix command failed: ${cmd.slice(0, 40)}`);
  }
  const fixed = runAcceptance(scenario, after);
  const passesFixed = fixed.every((r) => r.ok);
  rmSync(after, { recursive: true, force: true });

  const ok = failsUntouched && passesFixed && leaks.length === 0;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${scenario.id}`);
  if (!failsUntouched && !exempt) console.log("       acceptance passed on the untouched fixture: it measures nothing");
  if (replyValid !== null) console.log("       reply assertion validated against a reference and a bland approval");
  if (exempt && replyValid === null) console.log(`       exempt from the untouched-failure rule: ${scenario.reason}`);
  if (!passesFixed) console.log(`       reference fix does not pass: ${fixed.filter((r) => !r.ok).map((r) => r.run).join("; ")}`);
  for (const l of leaks) console.log(`       leakage: ${l}`);
}
console.log(`\n${failures === 0 ? "all scenarios valid" : `${failures} invalid`}`);
process.exit(failures ? 1 : 0);
