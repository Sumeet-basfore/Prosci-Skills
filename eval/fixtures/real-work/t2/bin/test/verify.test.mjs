// Behaviour tests for bin/verify. Each test drives the CLI and reads what a reviewer would read:
// the exit code, the printed receipt line, and the appended receipt record.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const binDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "factory-"));
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}

const state = () => mkdtempSync(join(tmpdir(), "factory-state-"));
const run = (args) =>
  spawnSync(process.execPath, [join(binDir, "verify"), ...args], { encoding: "utf8" });

test("records a failing receipt and stops at the first failing command", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { test: "node -e 'process.exit(3)'", build: "echo never" } }),
    "AGENTS.md": "```factory\ntest: npm test\nbuild: npm run build\n```\n",
  });
  const stateDir = state();
  const r = run([dir, "--state-dir", stateDir]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^FAIL test-failed receipt [0-9a-f]{12}/);

  const lines = readFileSync(join(stateDir, "verify.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.equal(record.verdict, "FAIL");
  assert.equal(record.reason, "test-failed");
  assert.deepEqual(
    record.commands.map((c) => c.key),
    ["test"],
    "build must not run after a failing test",
  );
});

test("passes on green commands and records each command's exit and duration", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { typecheck: "node -e ''", test: "node -e ''" } }),
    "AGENTS.md": "```factory\ntypecheck: npm run typecheck\ntest: npm test\n```\n",
  });
  const r = run([dir, "--state-dir", state(), "--json"]);
  assert.equal(r.status, 0);
  const record = JSON.parse(r.stdout);
  assert.equal(record.verdict, "PASS");
  assert.deepEqual(record.commands.map((c) => c.key), ["typecheck", "test"]);
  for (const command of record.commands) {
    assert.equal(command.exit, 0);
    assert.equal(typeof command.ms, "number");
  }
});

test("dry-run prints the plan and runs nothing", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { test: "node -e 'process.exit(7)'" } }),
    "AGENTS.md": "```factory\ntest: npm test\n```\n",
  });
  const stateDir = state();
  const r = run([dir, "--dry-run", "--state-dir", stateDir, "--json"]);
  assert.equal(r.status, 0);
  const record = JSON.parse(r.stdout);
  assert.equal(record.verdict, "DRY");
  assert.deepEqual(record.commands.map((c) => c.key), ["test"]);
});

test("fails closed when the contract has no test command", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { build: "node -e ''" } }),
    "AGENTS.md": "```factory\nbuild: npm run build\n```\n",
  });
  const r = run([dir, "--state-dir", state()]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL no-test-command/);
});

test("fails on a command that does not resolve, before running anything", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { test: "node -e ''" } }),
    "AGENTS.md": "```factory\ntypecheck: npm run typecheck\ntest: npm test\n```\n",
  });
  const r = run([dir, "--state-dir", state()]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL contract:typecheck:no-script:typecheck/);
});

test("--file swaps test for test1 and fills the placeholder", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { test: "node -e 'process.exit(9)'", one: "node -e ''" } }),
    "AGENTS.md": "```factory\ntest: npm test\ntest1: npm run one -- {file}\n```\n",
  });
  const r = run([dir, "--file", "tests/a.test.js", "--state-dir", state(), "--json"]);
  assert.equal(r.status, 0);
  const record = JSON.parse(r.stdout);
  assert.deepEqual(record.commands.map((c) => c.key), ["test1"]);
  assert.match(record.commands[0].command, /tests\/a\.test\.js$/);
});

test("--file without a test1 key fails with its own reason", () => {
  const dir = fixture({
    "package.json": JSON.stringify({ scripts: { test: "node -e ''" } }),
    "AGENTS.md": "```factory\ntest: npm test\n```\n",
  });
  const r = run([dir, "--file", "x.js", "--state-dir", state()]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL no-test1-command/);
});
