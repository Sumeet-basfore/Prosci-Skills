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

test("reports an integration's files when measured against the pre-merge base", () => {
  const { dir, git } = repo();
  const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  git("checkout", "-qb", "feature");
  writeFileSync(join(dir, "added.mjs"), "export const BATCH = 8;\n");
  git("add", "-A");
  git("commit", "-qm", "feature");
  git("checkout", "-q", "master");
  git("-c", "user.name=t", "-c", "user.email=t@t", "merge", "--no-ff", "-q", "feature");

  // The tree matches HEAD after a merge, so the default view reports nothing.
  assert.deepEqual(changedFiles(dir), []);
  // The pre-merge base is the only view that shows what the integration brought in.
  assert.deepEqual(changedFiles(dir, base), ["added.mjs"]);
  rmSync(dir, { recursive: true, force: true });
});

test("reports files an agent committed during the run", () => {
  const { dir, git } = repo();
  const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  writeFileSync(join(dir, "committed-doc.md"), "documented\n");
  git("add", "-A");
  git("commit", "-qm", "agent work");

  // Against HEAD the tree is clean; against the run's base the committed file is visible.
  assert.deepEqual(changedFiles(dir), []);
  assert.deepEqual(changedFiles(dir, base), ["committed-doc.md"]);
  rmSync(dir, { recursive: true, force: true });
});
