// Deterministic execution tests. The fake backend replaces the agent, so every lifecycle rule can be
// exercised without a model call: dependencies, concurrency, retries, deadlines, ownership, cancellation,
// approval, and recovery.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";

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
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "success", delayMs: 800, files: { "out/u1.txt": "x\n" } } })] });
  const out = join(dir, "out");
  spawnSync(process.execPath, [RUN, plan, "--approve", approve(plan), "--out", out, "--deadline-min", "0.001", "--unit-deadline-min", "5"], { cwd: repo, encoding: "utf8" });
  const ledger = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
  assert.ok(ledger.units.every((u) => ["cancelled", "succeeded"].includes(u.status)), JSON.stringify(ledger.units.map((u) => u.status)));
  rmSync(dir, { recursive: true, force: true });
});

test("a unit that exceeds its own deadline fails and its process group is killed", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "hang" } })] });
  const out = join(dir, "out");
  const started = Date.now();
  const r = run(plan, { repo, out, extra: ["--unit-deadline-min", "0.02"] });
  const elapsed = Date.now() - started;
  assert.equal(r.status, 1);
  assert.equal(r.byId.get("u1").status, "failed");
  assert.match(r.byId.get("u1").transitions.at(-1).detail, /deadline exceeded/);
  assert.ok(elapsed < 20000, `should not wait for the 120s hang: ${elapsed}ms`);
  const pgid = r.byId.get("u1").evidence.at(-1).pgid;
  assert.throws(() => process.kill(-pgid, 0), /ESRCH/, "process group must be gone");
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
  // Requests come from the proxy, not from attempts: a fake run makes none, so nothing is charged.
  assert.equal(r.ledger.authorization.requestsUsed, 0);
  assert.deepEqual(r.ledger.requests, { reserved: 0, limit: 10, logged: 0 });
  rmSync(dir, { recursive: true, force: true });
});

test("independent units actually overlap when concurrency allows it", () => {
  const { dir, repo } = workspace();
  const units = Array.from({ length: 4 }, (_, i) => unit({
    id: `p${i}`, files: [`out/p${i}.txt`], checks: [`test -f out/p${i}.txt`],
    fake: { outcome: "success", delayMs: 400, files: { [`out/p${i}.txt`]: "x\n" } },
  }));
  const plan = writePlan(dir, { units });
  const out = join(dir, "out");
  const r = run(plan, { repo, out, extra: ["--concurrency", "2", "--unit-deadline-min", "1"] });
  assert.equal(r.status, 0, r.stderr);
  const windows = r.ledger.units.map((u) => ({ id: u.id, start: u.transitions.find((t) => t.to === "running").seq, end: u.transitions.at(-1).seq }));
  const overlapping = windows.filter((w, i) => windows.some((o, j) => i !== j && w.start < o.end && o.start < w.end));
  assert.ok(overlapping.length >= 2, `expected overlap, got ${JSON.stringify(windows)}`);
  // Serial execution would give four non-overlapping windows; concurrency 2 must interleave.
  const serial = windows.every((w, i) => windows.every((o, j) => i === j || w.end <= o.start || o.end <= w.start));
  assert.equal(serial, false, "windows did not overlap, so execution was sequential");
  rmSync(dir, { recursive: true, force: true });
});

test("saves each worker's raw output next to the ledger", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({})] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 0, r.stderr);
  const saved = readFileSync(join(out, "output", "u1-a1.stdout.jsonl"), "utf8");
  assert.match(saved, /"ok":true/);
  assert.ok(existsSync(join(out, "output", "u1-a1.stderr.txt")));
  rmSync(dir, { recursive: true, force: true });
});

test("records wall-clock and monotonic times without replacing sequence windows", () => {
  const { dir, repo } = workspace();
  const units = Array.from({ length: 2 }, (_, i) => unit({
    id: `t${i}`, files: [`out/t${i}.txt`], checks: [`test -f out/t${i}.txt`],
    fake: { outcome: "success", delayMs: 250, files: { [`out/t${i}.txt`]: "x\n" } },
  }));
  const out = join(dir, "out");
  const r = run(writePlan(dir, { units }), { repo, out, extra: ["--concurrency", "2"] });
  assert.equal(r.status, 0, r.stderr);

  for (const u of r.ledger.units) {
    assert.equal(typeof u.startedAt, "number");            // sequence stays
    assert.ok(Number.isInteger(u.finishedAt));
    assert.ok(u.startedAtEpoch > 0 && u.finishedAtEpoch >= u.startedAtEpoch);
    assert.ok(u.startedAtMono > 0 && u.finishedAtMono >= u.startedAtMono);
    for (const [i, t] of u.transitions.entries()) {
      assert.ok(t.wall > 0 && t.mono > 0);
      assert.ok(t.wall >= u.transitions[0].wall);
      if (i) assert.ok(t.mono >= u.transitions[i - 1].mono, "monotonic clock went backwards");
    }
    // The `running` transition carries the same clock reading the unit record does.
    const running = u.transitions.find((t) => t.to === "running");
    assert.equal(running.wall, u.startedAtEpoch);
    assert.equal(running.mono, u.startedAtMono);
    const [ev] = u.evidence;
    assert.ok(ev.finishedAtEpoch >= ev.startedAtEpoch);
    assert.ok(ev.finishedAtMono >= ev.startedAtMono);
    assert.ok(ev.ms >= 200, `monotonic duration too small: ${ev.ms}`);
    assert.ok(ev.wallMs >= 200, `wall duration too small: ${ev.wallMs}`);
    assert.equal(ev.finishedAtMono - ev.startedAtMono, ev.ms);
    assert.equal(ev.finishedAtEpoch - ev.startedAtEpoch, ev.wallMs);
  }

  // The same overlap the sequence windows show also holds on the clocks, which is what E2 lacked.
  const [a, b] = r.ledger.units;
  assert.ok(a.startedAtEpoch <= b.finishedAtEpoch && b.startedAtEpoch <= a.finishedAtEpoch, "wall windows do not overlap");
  rmSync(dir, { recursive: true, force: true });
});

test("times every attempt, not only the last one", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ budget: { tokens: 1000, estimatedCostUsd: 0.001, retries: 1 }, fake: { outcome: "fail", detail: "flaky" } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out });
  assert.equal(r.status, 1);
  const evidence = r.byId.get("u1").evidence;
  assert.equal(evidence.length, 2);
  assert.ok(evidence[0].startedAtMono < evidence[1].startedAtMono, "attempts share a start time");
  for (const ev of evidence) assert.ok(ev.finishedAtEpoch > 0 && ev.finishedAtMono > 0);
  rmSync(dir, { recursive: true, force: true });
});

test("dependent units never start before a predecessor succeeds", () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [
    unit({ id: "a", files: ["out/a.txt"], checks: ["test -f out/a.txt"], fake: { outcome: "success", delayMs: 300, files: { "out/a.txt": "a\n" } } }),
    unit({ id: "b", role: "verifier", files: ["out/b.txt"], dependsOn: ["a"], checks: ["test -f out/b.txt"], fake: { outcome: "success", files: { "out/b.txt": "b\n" } } }),
  ] });
  const out = join(dir, "out");
  const r = run(plan, { repo, out, extra: ["--concurrency", "3"] });
  assert.equal(r.status, 0, r.stderr);
  const a = r.byId.get("a");
  const b = r.byId.get("b");
  const aDone = a.transitions.find((t) => t.to === "succeeded").seq;
  const bStart = b.transitions.find((t) => t.to === "running").seq;
  assert.ok(bStart > aDone, `b started at ${bStart}, a succeeded at ${aDone}`);
  rmSync(dir, { recursive: true, force: true });
});

test("SIGINT kills the whole worker process group and records cancelled", async () => {
  const { dir, repo } = workspace();
  const plan = writePlan(dir, { units: [unit({ fake: { outcome: "hang" } })] });
  const out = join(dir, "out");
  const child = spawn(process.execPath, [RUN, plan, "--approve", approve(plan), "--out", out, "--unit-deadline-min", "5"], { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  // Wait until the unit is running, then interrupt the controller.
  const waitFor = Date.now() + 5000;
  while (Date.now() < waitFor) {
    if (existsSync(join(out, "ledger.json"))) {
      const l = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
      if (l.units?.[0]?.status === "running") break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  child.kill("SIGINT");
  const code = await new Promise((resolve) => child.on("close", resolve));
  assert.equal(code, 130);
  const ledger = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
  assert.equal(ledger.units[0].status, "cancelled");
  const pgid = ledger.units[0].evidence.at(-1)?.pgid;
  assert.ok(pgid, "the ledger should record the process group");
  assert.throws(() => process.kill(-pgid, 0), /ESRCH/, "worker group must be dead after cancellation");
  rmSync(dir, { recursive: true, force: true });
});

test("refuses an arm whose HEAD is not the authorized base", () => {
  const { dir, repo } = workspace();
  try {
    const plan = writePlan(dir, { baseCommit: "0".repeat(40), units: [unit()] });
    const r = run(plan, { repo, out: join(dir, "out") });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /HEAD is .*plan authorizes 0{40}/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("refuses an arm with a dirty tree before it claims an authorization", () => {
  const { dir, repo } = workspace();
  try {
    writeFileSync(join(repo, "README.md"), "# changed\n");
    const plan = writePlan(dir, { units: [unit()] });
    const r = run(plan, { repo, out: join(dir, "out") });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /not clean/);
    assert.equal(existsSync(join(dir, "out")), false, "no run directory is created for a refused arm");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("refuses to spend against a proxy that belongs to another execution", () => {
  const { dir, repo } = workspace();
  try {
    const identity = join(dir, "identity.json");
    writeFileSync(identity, JSON.stringify({ executionId: "someone-else", planHash: "other", budgetFile: "/tmp/x" }));
    const plan = writePlan(dir, { units: [unit()] });
    const r = spawnSync(process.execPath, [RUN, plan, "--approve", approve(plan), "--out", join(dir, "out"),
      "--proxy", "http://127.0.0.1:1", "--proxy-identity", identity, "--execution-id", "mine"], { cwd: repo, encoding: "utf8" });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /belongs to execution someone-else/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("writes the assigned skill bodies into the worker instructions", () => {
  const { dir, repo } = workspace();
  try {
    const plan = writePlan(dir, { units: [unit()] });
    const r = run(plan, { repo, out: join(dir, "out") });
    assert.equal(r.status, 0, r.stderr);
    const instructions = readFileSync(join(dir, "out", "instructions", "u1.md"), "utf8");
    const ship = readFileSync(join(ROOT, "skills", "prosci-ship", "SKILL.md"), "utf8");
    assert.ok(instructions.includes(ship.split("\n").find((l) => l.trim() && !l.startsWith("#")).trim()));
    assert.doesNotMatch(instructions, /## Assigned skill: prosci-review/);
    const ledger = JSON.parse(readFileSync(join(dir, "out", "ledger.json"), "utf8"));
    assert.equal(ledger.units[0].injection.assigned[0].name, "prosci-ship");
    assert.match(ledger.units[0].injection.fingerprint, /^[0-9a-f]{16}$/);
    assert.ok(ledger.units[0].injection.estimatedTokens > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("refuses a plan whose approved skill fingerprint no longer matches the package", () => {
  const { dir, repo } = workspace();
  try {
    const plan = writePlan(dir, { skillsFingerprint: "0".repeat(16), units: [unit()] });
    const r = run(plan, { repo, out: join(dir, "out") });
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /installed skill content is .*plan approves/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
