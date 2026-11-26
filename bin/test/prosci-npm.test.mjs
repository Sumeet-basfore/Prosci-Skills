import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = new URL("../..", import.meta.url).pathname;
const CLI = join(REPO, "bin", "prosci.mjs");
const SKILLS = readdirSync(join(REPO, "skills")).filter((d) => !d.startsWith("."));

const run = (args, home) =>
  spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO,
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });

const temp = () => mkdtempSync(join(tmpdir(), "prosci-npx-"));

test("prints usage and exits non-zero without arguments", () => {
  const home = temp();
  const result = run([], home);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /npx prosci --harness/);
  rmSync(home, { recursive: true, force: true });
});

test("checks every harness when --check has no --harness", () => {
  const home = temp();
  const checked = run(["--check"], home);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout + checked.stderr, /nothing installed by this script/);
  rmSync(home, { recursive: true, force: true });
});

test("survey subcommand returns read-only facts", () => {
  const home = temp();
  const result = run(["survey", REPO], home);
  assert.equal(result.status, 0, result.stderr);
  const facts = JSON.parse(result.stdout);
  assert.equal(facts.schema, 1);
  assert.ok(facts.facts.commands, "test command detected");
  rmSync(home, { recursive: true, force: true });
});

test("installs all skills into one harness and removes them", () => {
  const home = temp();
  const installed = run(["--harness", "pi"], home);
  assert.equal(installed.status, 0, installed.stderr);
  const skillsDir = join(home, ".agents", "skills");
  for (const skill of SKILLS) {
    assert.ok(existsSync(join(skillsDir, skill, "SKILL.md")), `${skill} installed`);
  }
  assert.ok(existsSync(join(skillsDir, ".prosci-install.json")), "marker written");

  const checked = run(["--check", "--harness", "pi"], home);
  assert.equal(checked.status, 0, checked.stderr);

  const removed = run(["--remove", "--harness", "pi"], home);
  assert.equal(removed.status, 0, removed.stderr);
  assert.equal(existsSync(join(skillsDir, "prosci")), false);
  rmSync(home, { recursive: true, force: true });
});

test("--all installs into every supported harness directory", () => {
  const home = temp();
  const result = run(["--all"], home);
  assert.equal(result.status, 0, result.stderr);
  for (const dir of [".agents/skills", ".claude/skills", ".codex/skills", ".cursor/skills", ".config/opencode/skills"]) {
    assert.ok(existsSync(join(home, dir, "prosci", "SKILL.md")), `${dir} installed`);
  }
  rmSync(home, { recursive: true, force: true });
});

test("refuses an unknown harness without touching the filesystem", () => {
  const home = temp();
  const result = run(["--harness", "unknown"], home);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown harness/);
  assert.deepEqual(readdirSync(home), []);
  rmSync(home, { recursive: true, force: true });
});

test("package metadata ships the installer and every skill", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.bin.prosci, "./bin/prosci.mjs");
  assert.ok(pkg.files.includes("skills"));
  assert.ok(pkg.files.includes("bin/install-skills"));
  assert.ok(existsSync(join(REPO, "LICENSE")));
  assert.ok(SKILLS.length >= 17, `expected 17 skills, found ${SKILLS.length}`);
});

test("--version prints the package version, not usage", () => {
  const home = temp();
  const r = run(["--version"], home);
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), pkg.version);
  rmSync(home, { recursive: true, force: true });
});
