// The survey is an evidence tool: it must report the same facts twice, change nothing, and never open a
// credential store. Each test drives the CLI the way init will.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");
const SURVEY = join(ROOT, "bin", "prosci-survey");
const FIXTURES = join(ROOT, "eval", "fixtures", "survey");

const survey = (dir, args = []) => {
  const r = spawnSync(process.execPath, [SURVEY, dir, ...args], { encoding: "utf8" });
  return { ...r, json: r.status === 0 ? JSON.parse(r.stdout) : null };
};

const hashTree = (dir) => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const full = join(d, e.name);
    return e.isDirectory() ? (e.name === ".git" ? [] : walk(full)) : [[full, createHash("sha256").update(readFileSync(full)).digest("hex")]];
  });
  return JSON.stringify(walk(dir).sort());
};

test("reports the declared test command and instruction file", () => {
  const r = survey(join(FIXTURES, "node-test"));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.facts.commands.value.test.command, "node --test");
  assert.match(r.json.facts.commands.value.test.source, /AGENTS\.md/);
  assert.deepEqual(r.json.facts.instructions.value, ["AGENTS.md"]);
  assert.deepEqual(r.json.facts.tests.value.frameworks, ["node:test"]);
});

test("reports python and rust stacks with conventional commands", () => {
  const py = survey(join(FIXTURES, "python-pytest"));
  assert.deepEqual(py.json.facts.stacks.value, ["python"]);
  assert.equal(py.json.facts.commands.value.test.command, "python -m pytest");
  const rs = survey(join(FIXTURES, "rust-cargo"));
  assert.deepEqual(rs.json.facts.stacks.value, ["rust"]);
  assert.equal(rs.json.facts.commands.value.test.command, "cargo test");
});

test("flags a repo with no instructions, no tests and no CI", () => {
  const r = survey(join(FIXTURES, "no-instructions"));
  const codes = r.json.risks.map((x) => x.code);
  for (const code of ["no-instructions", "no-test-command", "no-ci"]) assert.ok(codes.includes(code), code);
  assert.deepEqual(r.json.facts.stacks.value, []);
  assert.ok(r.json.unknowns.some((u) => u.field === "stacks"));
});

test("detects a monorepo from workspace declarations", () => {
  const r = survey(join(FIXTURES, "monorepo"));
  assert.equal(r.json.facts.monorepo.value, true);
});

test("every fact carries a source and unknown values are explicit", () => {
  const r = survey(join(FIXTURES, "rust-cargo"));
  const sourced = (entry) => entry && "value" in entry && typeof entry.source === "string" && entry.source.length > 0;
  for (const [key, entry] of Object.entries(r.json.facts)) {
    // Some facts are containers of facts (vcs, harnesses); each child must still carry a source.
    const ok = sourced(entry) || Object.values(entry).every(sourced);
    assert.ok(ok, `${key} has an entry without a source`);
  }
  assert.ok(Array.isArray(r.json.unknowns));
});

test("output is deterministic across runs", () => {
  const a = survey(join(FIXTURES, "node-test")).stdout;
  const b = survey(join(FIXTURES, "node-test")).stdout;
  assert.equal(a, b);
});

test("does not modify the repository", () => {
  const dir = mkdtempSync(join(tmpdir(), "survey-"));
  cpSync(join(FIXTURES, "node-test"), dir, { recursive: true });
  const before = hashTree(dir);
  survey(dir);
  survey(dir, ["--verify"]);
  assert.equal(hashTree(dir), before);
  rmSync(dir, { recursive: true, force: true });
});

test("never reads the credential store", () => {
  const dir = mkdtempSync(join(tmpdir(), "survey-"));
  const home = join(dir, "home", ".pi", "agent");
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, "models.json"), JSON.stringify({ providers: { demo: { models: [{ id: "m-1" }] } } }));
  writeFileSync(join(home, "auth.json"), JSON.stringify({ demo: { key: "SENTINEL-SECRET-VALUE" } }));
  const repo = join(dir, "repo");
  mkdirSync(repo);
  const r = spawnSync(process.execPath, [SURVEY, repo], { encoding: "utf8", env: { ...process.env, HOME: join(dir, "home") } });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes("SENTINEL-SECRET-VALUE"), "survey output contains a credential value");
  assert.ok(!r.stdout.includes("auth.json"), "survey output names the auth store");
  assert.deepEqual(JSON.parse(r.stdout).facts.models.value.providers, [{ name: "demo", models: ["m-1"] }]);
  rmSync(dir, { recursive: true, force: true });
});
