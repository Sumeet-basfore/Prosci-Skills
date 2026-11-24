// Behaviour tests for bin/install-skills. Each test drives the CLI and inspects the target, because
// the failure that matters is a user's file being replaced or deleted.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync, lstatSync, symlinkSync, readFileSync, readlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const binDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const install = (args) => spawnSync(process.execPath, [join(binDir, "install-skills"), ...args], { encoding: "utf8" });
const target = () => mkdtempSync(join(tmpdir(), "prosci-inst-"));
const entries = (dir) => readdirSync(dir).filter((n) => n !== ".prosci-install.json").sort();
const NINE = 9;

test("installs all nine, resolves every route link, and writes a marker", () => {
  const dir = target();
  const r = install(["--target", dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(entries(dir).length, NINE);

  const ship = readFileSync(join(dir, "prosci-ship", "SKILL.md"), "utf8");
  assert.match(ship, /^name: prosci-ship$/m);
  for (const ref of [...ship.matchAll(/\.\.\/([a-z-]+)\/SKILL\.md/g)].map((m) => m[1])) {
    assert.ok(existsSync(join(dir, ref, "SKILL.md")), `${ref} does not resolve from the install`);
  }
  const marker = JSON.parse(readFileSync(join(dir, ".prosci-install.json"), "utf8"));
  assert.equal(marker.state, "complete");
  assert.equal(Object.keys(marker.entries).length, NINE);
});

test("installing twice is idempotent", () => {
  const dir = target();
  assert.equal(install(["--target", dir]).status, 0);
  const before = JSON.stringify(entries(dir));
  const second = install(["--target", dir]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(JSON.stringify(entries(dir)), before);
});

test("refuses to replace an entry it did not create", () => {
  const dir = target();
  mkdirSync(join(dir, "prosci-ship"));
  writeFileSync(join(dir, "prosci-ship", "SKILL.md"), "hand written\n");
  const r = install(["--target", dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /prosci-ship/);
  assert.equal(readFileSync(join(dir, "prosci-ship", "SKILL.md"), "utf8"), "hand written\n");
});

test("remove restores the target to its prior state", () => {
  const dir = target();
  writeFileSync(join(dir, "unrelated.txt"), "keep me\n");
  const before = entries(dir);
  install(["--target", dir]);
  const r = install(["--target", dir, "--remove"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(entries(dir), before);
  assert.equal(existsSync(join(dir, ".prosci-install.json")), false);
  assert.equal(readFileSync(join(dir, "unrelated.txt"), "utf8"), "keep me\n");
});

test("remove keeps a copy the user edited, and says so", () => {
  const dir = target();
  assert.equal(install(["--target", dir, "--copy"]).status, 0);
  const edited = join(dir, "prosci-bar", "SKILL.md");
  writeFileSync(edited, `${readFileSync(edited, "utf8")}\nlocal edit\n`);
  const r = install(["--target", dir, "--remove"]);
  assert.equal(r.status, 1);
  assert.ok(existsSync(edited), "the edited copy must survive");
  assert.match(r.stdout, /prosci-bar/);
  const marker = JSON.parse(readFileSync(join(dir, ".prosci-install.json"), "utf8"));
  assert.equal(marker.state, "partial");
  assert.ok(marker.entries["prosci-bar"]);
});

test("a symlink pointing somewhere else is not treated as ours", () => {
  const dir = target();
  const elsewhere = mkdtempSync(join(tmpdir(), "prosci-elsewhere-"));
  mkdirSync(join(elsewhere, "fake"));
  writeFileSync(join(elsewhere, "fake", "SKILL.md"), "name: prosci-bar\n");
  symlinkSync(join(elsewhere, "fake"), join(dir, "prosci-bar"), "dir");
  const r = install(["--target", dir]);
  assert.equal(r.status, 1);
  assert.equal(readlinkSync(join(dir, "prosci-bar")), join(elsewhere, "fake"));
});

test("an interrupted install is repaired on the next run", () => {
  const dir = target();
  const partial = target();
  // Build a partial install the way a crash would leave one: marker records one entry, that entry is
  // on disk, the rest are absent.
  assert.equal(install(["--target", partial]).status, 0);
  const one = JSON.parse(readFileSync(join(partial, ".prosci-install.json"), "utf8")).entries.prosci;
  symlinkSync(join(binDir, "..", "skills", "prosci"), join(dir, "prosci"), "dir");
  writeFileSync(
    join(dir, ".prosci-install.json"),
    JSON.stringify({ state: "installing", mode: "link", installedAt: new Date().toISOString(), entries: { prosci: one } }),
  );

  const r = install(["--target", dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(entries(dir).length, NINE);
  assert.equal(JSON.parse(readFileSync(join(dir, ".prosci-install.json"), "utf8")).state, "complete");
});

test("an unlisted directory is not deleted by a repair", () => {
  const dir = target();
  mkdirSync(join(dir, "prosci-bar"));
  writeFileSync(join(dir, "prosci-bar", "SKILL.md"), "mine\n");
  writeFileSync(join(dir, ".prosci-install.json"), JSON.stringify({ state: "installing", mode: "link", entries: {} }));
  const r = install(["--target", dir]);
  assert.equal(r.status, 1);
  assert.equal(readFileSync(join(dir, "prosci-bar", "SKILL.md"), "utf8"), "mine\n");
});

test("--check reports drift without changing anything", () => {
  const dir = target();
  install(["--target", dir, "--copy"]);
  const victim = join(dir, "prosci-docs", "SKILL.md");
  writeFileSync(victim, readFileSync(victim, "utf8").replace("name: prosci-docs", "name: wrong-name"));
  const r = install(["--target", dir, "--check"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /declares name 'wrong-name'/);
});

test("--dry-run creates nothing", () => {
  const dir = target();
  const r = install(["--target", dir, "--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(entries(dir), []);
});

test("an unknown harness is refused with the known list", () => {
  const r = install(["--harness", "nope"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /known: pi, claude, codex, cursor, opencode/);
});
