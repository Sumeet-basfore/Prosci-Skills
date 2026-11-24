import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { changedFiles } from "../lib.mjs";

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "changed-"));
  const git = (...args) => spawnSync("git", args, { cwd: dir });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, "a.txt"), "a");
  writeFileSync(join(dir, "b.txt"), "b");
  git("add", ".");
  git("commit", "-qm", "init");
  return { dir, git };
}

test("reports a modified file", () => {
  const { dir } = repo();
  writeFileSync(join(dir, "a.txt"), "a2");
  assert.deepEqual(changedFiles(dir), ["a.txt"]);
  rmSync(dir, { recursive: true, force: true });
});

test("reports a newly created file, which git diff hid for three runs", () => {
  const { dir } = repo();
  writeFileSync(join(dir, "c.txt"), "c");
  assert.deepEqual(changedFiles(dir), ["c.txt"]);
  rmSync(dir, { recursive: true, force: true });
});

test("reports a staged file and a path with a space", () => {
  const { dir, git } = repo();
  writeFileSync(join(dir, "two words.txt"), "x");
  git("add", "two words.txt");
  assert.deepEqual(changedFiles(dir), ["two words.txt"]);
  rmSync(dir, { recursive: true, force: true });
});

test("reports nothing on a clean tree", () => {
  const { dir } = repo();
  assert.deepEqual(changedFiles(dir), []);
  rmSync(dir, { recursive: true, force: true });
});
