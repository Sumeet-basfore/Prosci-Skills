// Deterministic execution tests. The fake backend replaces the agent, so every lifecycle rule can be
// exercised without a model call: dependencies, concurrency, retries, deadlines, ownership, cancellation,
// approval, and recovery.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUN = join(ROOT, "bin", "prosci-swarm-run");
const HASH = join(ROOT, "bin", "prosci-swarm");

function workspace() {
  // A throwaway git repo per test: the controller creates worktrees and branches, which must never touch
  // this repository.
  const dir = mkdtempSync(join(tmpdir(), "swarm-run-"));
  const repo = join(dir, "repo");
  mkdirSync(repo);
  const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  git("init", "-q");
  writeFileSync(join(repo, "README.md"), "# base\n");
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
  return { dir, repo, git };
}

const unit = (over = {}) => ({
  id: "u1", goal: "do it", role: "implementer", skills: ["prosci-ship"],
  files: ["out/u1.txt"], dependsOn: [], checks: ["test -f out/u1.txt"], rollback: "revert",
  approval: { required: false }, budget: { tokens: 1000, estimatedCostUsd: 0.001, retries: 0 },
  fake: { outcome: "success", files: { "out/u1.txt": "done\n" } },
  ...over,
});

function writePlan(dir, plan, name = "plan.json") {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify({ id: "test", profile: "balanced", ...plan }, null, 2));
  return file;
}

function approve(planFile) {
  return spawnSync(process.execPath, [HASH, "hash", planFile], { encoding: "utf8" }).stdout.trim();
}

function run(planFile, { repo, out, extra = [] }) {
  const r = spawnSync(process.execPath, [RUN, planFile, "--approve", approve(planFile), "--out", out, ...extra], {
    cwd: repo, encoding: "utf8", timeout: 60000,
  });
  const ledger = existsSync(join(out, "ledger.json")) ? JSON.parse(readFileSync(join(out, "ledger.json"), "utf8")) : null;
  const byId = new Map((ledger?.units ?? []).map((u) => [u.id, u]));
  return { ...r, ledger, byId };
}

test("runs a dependency chain to completion and records transitions", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ id: "a", files: ["out/a.txt"], checks: ["test -f out/a.txt"], fake: { outcome: "success", files: { "out/a.txt": "a\n" } } }),
    unit({ id: "b", role: "verifier", files: ["out/b.txt"], dependsOn: ["a"], checks: ["test -f out/b.txt"], fake: { outcome: "success", files: { "out/b.txt": "b\n" } } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.byId.get("a").status, "succeeded");
  assert.equal(r.byId.get("b").status, "succeeded");
  assert.deepEqual(r.byId.get("a").transitions.map((t) => t.to), ["ready", "running", "succeeded"]);
  assert.ok(r.byId.get("a").branch.includes("a"));
  rmSync(dir, { recursive: true, force: true });
});

test("blocks dependents when a dependency fails", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ id: "a", fake: { outcome: "fail", detail: "boom" } }),
    unit({ id: "b", role: "verifier", files: ["out/b.txt"], dependsOn: ["a"], checks: ["true"], fake: { outcome: "success", files: { "out/b.txt": "b\n" } } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.equal(r.byId.get("a").status, "failed");
  assert.equal(r.byId.get("b").status, "blocked");
  assert.match(r.byId.get("b").transitions.at(-1).detail, /did not succeed/);
  rmSync(dir, { recursive: true, force: true });
});

test("retries a failing unit up to its budget, then stops", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ budget: { tokens: 10, estimatedCostUsd: 0.001, retries: 2 }, fake: { outcome: "fail", detail: "flaky" } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.equal(r.byId.get("u1").attempts, 3);
  assert.equal(r.byId.get("u1").status, "failed");
  rmSync(dir, { recursive: true, force: true });
});

test("rejects changes outside the unit's owned files", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ files: ["out/u1.txt"], checks: ["test -f out/u1.txt"], fake: { outcome: "success", files: { "out/u1.txt": "ok\n", "src/elsewhere.mjs": "leak\n" } } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.equal(r.byId.get("u1").status, "failed");
  assert.match(r.byId.get("u1").transitions.at(-1).detail, /outside ownership: src\/elsewhere.mjs/);
  rmSync(dir, { recursive: true, force: true });
});

test("fails a unit whose acceptance check does not pass", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ checks: ["test -f nope.txt"], fake: { outcome: "success", files: { "out/u1.txt": "x\n" } } })] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.match(r.byId.get("u1").transitions.at(-1).detail, /acceptance failed/);
  rmSync(dir, { recursive: true, force: true });
});

test("treats a worker crash as a failure", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "crash" } })] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.match(r.byId.get("u1").transitions.at(-1).detail, /crash/);
  rmSync(dir, { recursive: true, force: true });
});

test("rejects an invalid worker result", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "invalid" } })] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  assert.match(r.byId.get("u1").transitions.at(-1).detail, /invalid/);
  rmSync(dir, { recursive: true, force: true });
});

test("refuses to run without approval", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit()] });
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [RUN, plan, "--out", out], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /approval required/);
  assert.ok(!existsSync(join(out, "ledger.json")));
  rmSync(dir, { recursive: true, force: true });
});

test("rejects an approval that belongs to a different plan", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit()] });
  const other = writePlan(dir, { units: [unit({ goal: "something else" })] }, "other.json");
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [RUN, plan, "--approve", approve(other), "--out", out], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /does not match this plan/);
  rmSync(dir, { recursive: true, force: true });
});

test("enforces the concurrency limit", () => {
  const { dir, repo } = workspace();
  const units = Array.from({ length: 3 }, (_, i) => unit({ id: `u${i}`, files: [`out/u${i}.txt`], checks: [`test -f out/u${i}.txt`], fake: { outcome: "success", files: { [`out/u${i}.txt`]: "x\n" } } }));
  const plan = writePlan(dir, { units });
  const out = join(dir, "out");
  const over = spawnSync(process.execPath, [RUN, plan, "--approve", approve(plan), "--out", out, "--concurrency", "9"], { cwd: repo, encoding: "utf8" });
  assert.equal(over.status, 2);
  assert.match(over.stderr, /exceeds the profile limit/);
  rmSync(dir, { recursive: true, force: true });
});

test("cancels everything when the global deadline passes", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "success", delayMs: 400, files: { "out/u1.txt": "x\n" } } })] });
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [RUN, plan, "--approve", approve(plan), "--out", out, "--deadline-min", "0.001"], { cwd: repo, encoding: "utf8" });
  const ledger = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
  assert.ok(ledger.units.every((u) => ["cancelled", "succeeded"].includes(u.status)), JSON.stringify(ledger.units.map((u) => u.status)));
  rmSync(dir, { recursive: true, force: true });
});

test("recovers an interrupted run without redoing completed units", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ id: "a", files: ["out/a.txt"], checks: ["test -f out/a.txt"], fake: { outcome: "success", files: { "out/a.txt": "a\n" } } }),
    unit({ id: "b", role: "verifier", files: ["out/b.txt"], dependsOn: ["a"], checks: ["test -f out/b.txt"], fake: { outcome: "success", files: { "out/b.txt": "b\n" } } }),
  ] });
  const out = join(dir, "out");
  const first = run(plan, { repo, out });
  assert.equal(first.status, 0);

  // Simulate a crash mid-run: mark b as interrupted in the ledger, then resume.
  const ledger = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
  ledger.units.find((u) => u.id === "b").status = "running";
  writeFileSync(join(out, "ledger.json"), JSON.stringify(ledger, null, 2));

  const second = run(plan, { repo, out, extra: ["--resume"] });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.byId.get("a").status, "succeeded");
  assert.equal(second.byId.get("b").status, "succeeded");
  assert.ok(second.byId.get("b").transitions.some((t) => t.to === "planned" && /recovered/.test(t.detail)));
  rmSync(dir, { recursive: true, force: true });
});

test("the approval hash changes when the plan changes", () => {
  const { dir } = workspace();
  const a = writePlan(dir, { units: [unit()] });
  const b = writePlan(dir, { units: [unit({ files: ["out/other.txt"] })] }, "b.json");
  assert.notEqual(approve(a), approve(b));
  rmSync(dir, { recursive: true, force: true });
});

test("refuses a second execution under the same authorization", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit()] });
  const out = join(dir, "out");
  const auth = join(dir, "auth.json");
  const first = run(plan, { repo, out, extra: ["--authorization", auth, "--max-executions", "1"] });
  assert.equal(first.status, 0, first.stderr);
  const second = run(plan, { repo, out: join(dir, "out2"), extra: ["--authorization", auth, "--max-executions", "1"] });
  assert.equal(second.status, 2);
  assert.match(second.stderr, /already used/);
  rmSync(dir, { recursive: true, force: true });
});

test("clamps retries to the authorization, not the plan", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ budget: { tokens: 10, estimatedCostUsd: 0, retries: 5 }, fake: { outcome: "fail", detail: "always" } })] });
  const out = join(dir, "out");
  const auth = join(dir, "auth.json");
  const r = run(plan, { repo, out, extra: ["--authorization", auth, "--max-retries", "1"] });
  assert.equal(r.status, 1);
  assert.equal(r.byId.get("u1").attempts, 2, "one attempt plus one authorized retry");
  assert.deepEqual(r.byId.get("u1").retriesClamped, { plan: 5, authorized: 1 });
  rmSync(dir, { recursive: true, force: true });
});

test("records the authorization and request usage in the ledger", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit()] });
  const out = join(dir, "out");
  const auth = join(dir, "auth.json");
  const r = run(plan, { repo, out, extra: ["--authorization", auth, "--max-executions", "1", "--max-requests", "10"] });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.ledger.authorization.executions, 1);
  assert.equal(r.ledger.authorization.maxRetriesPerUnit, 1);
  assert.ok(r.ledger.authorization.requestsUsed >= 1);
  rmSync(dir, { recursive: true, force: true });
});
