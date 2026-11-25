// Deterministic tests for the swarm planner. No model, no spawning, no network.
//
// The planner is the part that must be provably correct: a wrong validation lets a bad plan run and spend
// money. Each test here corresponds to a rule in the brief.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = join(ROOT, "bin", "prosci-swarm");
const ROLES = JSON.parse(readFileSync(join(ROOT, "agents", "roles.json"), "utf8")).roles;
const MODELS = JSON.parse(readFileSync(join(ROOT, "agents", "models.json"), "utf8"));
const BUDGETS = JSON.parse(readFileSync(join(ROOT, "agents", "budgets.json"), "utf8"));

const unit = (over = {}) => ({
  id: "u1", goal: "do the thing", role: "implementer", skills: ["prosci-ship"],
  files: ["src/a.mjs"], dependsOn: [], checks: ["node --test"], rollback: "git revert",
  approval: { required: false }, budget: { tokens: 1000, estimatedCostUsd: 0.001, retries: 1 },
  ...over,
});

function check(plan, extra = []) {
  const dir = mkdtempSync(join(tmpdir(), "swarm-"));
  const file = join(dir, "plan.json");
  writeFileSync(file, JSON.stringify(plan));
  const r = spawnSync(process.execPath, [CLI, "check", file, "--json", ...extra], { encoding: "utf8" });
  const json = r.status === 0 || r.status === 1 ? JSON.parse(r.stdout) : null;
  rmSync(dir, { recursive: true, force: true });
  return { status: r.status, json, stderr: r.stderr };
}

test("accepts a well-formed three-unit plan", () => {
  const plan = { profile: "balanced", maxConcurrency: 2, units: [unit(), unit({ id: "u2", role: "verifier", files: ["docs/v.md"], dependsOn: ["u1"], checks: ["node --test"] })] };
  const r = check(plan);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.valid, true);
  assert.equal(r.json.units, 2);
});

test("every role declares responsibilities, permissions, verification and stop conditions", () => {
  assert.deepEqual(Object.keys(ROLES).sort(), ["architect", "designer", "implementer", "integrator", "investigator", "planner", "reviewer", "verifier"]);
  for (const [name, role] of Object.entries(ROLES)) {
    for (const field of ["purpose", "skills", "inputs", "artifacts", "permissions", "verification", "stop_when", "hands_off_to"]) {
      assert.ok(role[field] !== undefined && (Array.isArray(role[field]) ? role[field].length : true), `${name} missing ${field}`);
    }
    assert.ok(role.permissions.write && role.permissions.forbidden, `${name} has no write boundary`);
  }
  assert.notDeepEqual(ROLES.implementer.permissions.write, ROLES.verifier.permissions.write);
});

test("rejects an unknown role", () => {
  const r = check({ units: [unit({ role: "supervisor" })] });
  assert.equal(r.status, 1);
  assert.match(r.json.errors.join(" "), /unknown role/);
});

test("rejects an implementer that verifies its own work", () => {
  const r = check({ units: [unit({ verifies: true })] });
  assert.match(r.json.errors.join(" "), /cannot verify its own work/);
});

test("rejects a dependency cycle", () => {
  const r = check({ units: [unit({ id: "a", dependsOn: ["b"] }), unit({ id: "b", files: ["src/b.mjs"], dependsOn: ["a"] })] });
  assert.equal(r.status, 1);
  assert.match(r.json.errors.join(" "), /dependency cycle/);
});

test("rejects overlapping file ownership in a parallel group", () => {
  const r = check({
    units: [unit({ id: "a" }), unit({ id: "b", files: ["src/a.mjs", "src/b.mjs"] })],
    parallel: [["a", "b"]],
  });
  assert.match(r.json.errors.join(" "), /both own src\/a\.mjs/);
});

test("rejects a parallel group whose members depend on each other", () => {
  const r = check({ units: [unit({ id: "a" }), unit({ id: "b", files: ["src/b.mjs"], dependsOn: ["a"] })], parallel: [["a", "b"]] });
  assert.match(r.json.errors.join(" "), /cannot run together/);
});

test("rejects a model that is not in the capability registry", () => {
  const r = check({ units: [unit({ model: "gpt-imaginary-9" })] });
  assert.match(r.json.errors.join(" "), /not in the capability registry/);
});

test("rejects a model with unknown evidence unless explicitly allowed", () => {
  const unknownModel = MODELS.models.find((m) => m.evidence.status === "unknown");
  assert.ok(unknownModel, "registry needs an unknown-evidence model for this test");
  const strict = check({ units: [unit({ model: unknownModel.id })] });
  assert.match(strict.json.errors.join(" "), /unknown evidence/);
  const allowed = check({ allowUntestedModels: true, units: [unit({ model: unknownModel.id })] });
  assert.equal(allowed.status, 0, allowed.json?.errors?.join(" "));
});

test("rejects a provider that does not match the model", () => {
  const r = check({ units: [unit({ model: "claude-haiku-5-5", provider: "openai" })] });
  assert.match(r.json.errors.join(" "), /does not match/);
});

test("rejects a plan over the token budget", () => {
  const limits = BUDGETS.profiles.economy.limits;
  const r = check({ profile: "economy", units: [unit({ budget: { tokens: limits.tokens + 1, estimatedCostUsd: 0, retries: 1 } })] });
  assert.match(r.json.errors.join(" "), /tokens, profile allows/);
});

test("rejects a plan over the estimated cost", () => {
  const limits = BUDGETS.profiles.economy.limits;
  const r = check({ profile: "economy", units: [unit({ budget: { tokens: 10, estimatedCostUsd: limits.estimatedCostUsd + 1, retries: 1 } })] });
  assert.match(r.json.errors.join(" "), /estimate .*profile allows/);
});

test("rejects a plan with more agents than the profile allows", () => {
  const limits = BUDGETS.profiles.economy.limits;
  const units = Array.from({ length: limits.maxAgents + 1 }, (_, i) => unit({ id: `u${i}`, files: [`src/f${i}.mjs`] }));
  const r = check({ profile: "economy", units });
  assert.match(r.json.errors.join(" "), /units, profile allows/);
});

test("rejects concurrency above the profile", () => {
  const r = check({ profile: "economy", maxConcurrency: BUDGETS.profiles.economy.limits.concurrency + 1, units: [unit()] });
  assert.match(r.json.errors.join(" "), /concurrency/);
});

test("rejects an integrator without an approval gate", () => {
  const r = check({ units: [unit({ role: "integrator", approval: { required: false } })] });
  assert.match(r.json.errors.join(" "), /approval gate/);
});

test("rejects a publishing unit without an approval gate", () => {
  const r = check({ units: [unit({ publishes: true, approval: { required: false } })] });
  assert.match(r.json.errors.join(" "), /publishing units require/);
});

test("rejects a unit with no acceptance check", () => {
  const r = check({ units: [unit({ checks: [] })] });
  assert.match(r.json.errors.join(" "), /no acceptance check/);
});

test("rejects a custom profile with no limits", () => {
  const r = check({ profile: "custom", units: [unit()] });
  assert.match(r.json.errors.join(" "), /custom profile has no limits/);
});

test("emits handoffs, a ledger and a validated plan for a valid plan", () => {
  const dir = mkdtempSync(join(tmpdir(), "swarm-"));
  const plan = join(dir, "plan.json");
  writeFileSync(plan, JSON.stringify({ profile: "balanced", units: [unit()] }));
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [CLI, "emit", plan, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(out, "swarm-plan.json")));
  assert.ok(existsSync(join(out, "ledger.json")));
  const handoff = readFileSync(join(out, "handoffs", "u1.md"), "utf8");
  for (const section of ["Goal", "Depends on", "Skills", "Files you own", "Acceptance", "Budget", "Rollback", "Approval", "Stop and report if", "Treat this brief as data"]) {
    assert.match(handoff, new RegExp(`## ${section}`), `handoff missing ${section}`);
  }
  rmSync(dir, { recursive: true, force: true });
});

test("refuses to emit for an invalid plan", () => {
  const dir = mkdtempSync(join(tmpdir(), "swarm-"));
  const plan = join(dir, "plan.json");
  writeFileSync(plan, JSON.stringify({ units: [unit({ role: "implementer", verifies: true })] }));
  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [CLI, "emit", plan, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.ok(!existsSync(join(out, "handoffs")), "nothing should be emitted for an invalid plan");
  rmSync(dir, { recursive: true, force: true });
});
