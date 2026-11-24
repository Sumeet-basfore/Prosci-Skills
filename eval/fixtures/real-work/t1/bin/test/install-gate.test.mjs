// Behaviour tests for bin/install-gate. The observable behaviour is the file it writes, its
// refusal to overwrite, and the owner it reads from the repo's own remote.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const binDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function repoWithRemote(url) {
  const dir = mkdtempSync(join(tmpdir(), "factory-gate-"));
  spawnSync("git", ["init", "-q", dir]);
  spawnSync("git", ["-C", dir, "remote", "add", "origin", url]);
  return dir;
}

const install = (args) => spawnSync(process.execPath, [join(binDir, "install-gate"), ...args], { encoding: "utf8" });

test("writes the workflow with the owner read from origin", () => {
  const dir = repoWithRemote("https://github.com/Sumeet-basfore/lore.git");
  const r = install([dir]);
  assert.equal(r.status, 0);
  const workflow = readFileSync(join(dir, ".github", "workflows", "factory.yml"), "utf8");
  assert.match(workflow, /repository: Sumeet-basfore\/prosci/);
  assert.match(workflow, /name: factory/);
  assert.match(r.stdout, /Sumeet-basfore\/lore/);
});

test("refuses to overwrite an existing workflow", () => {
  const dir = repoWithRemote("git@github.com:meow687687/healthOraa.git");
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(join(dir, ".github", "workflows", "factory.yml"), "handwritten\n");
  const r = install([dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already exists/);
  assert.equal(readFileSync(join(dir, ".github", "workflows", "factory.yml"), "utf8"), "handwritten\n");
});

test("--owner overrides a missing remote", () => {
  const dir = mkdtempSync(join(tmpdir(), "factory-gate-"));
  spawnSync("git", ["init", "-q", dir]);
  const r = install([dir, "--owner", "someone-else"]);
  assert.equal(r.status, 0);
  assert.match(readFileSync(join(dir, ".github", "workflows", "factory.yml"), "utf8"), /someone-else\/prosci/);
});

test("a missing owner is a refusal, not a silent bad file", () => {
  const dir = mkdtempSync(join(tmpdir(), "factory-gate-"));
  spawnSync("git", ["init", "-q", dir]);
  const r = install([dir]);
  assert.equal(r.status, 2);
  assert.equal(existsSync(join(dir, ".github", "workflows", "factory.yml")), false);
});
