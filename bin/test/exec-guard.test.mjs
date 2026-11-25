import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fixtureHash, inspectArm, restoreBase } from "../lib/exec-guard.mjs";

const env = { ...process.env, GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" };

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "arm-"));
  spawnSync("git", ["init", "-q"], { cwd: dir, env });
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/a.mjs"), "export const a = 1;\n");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
  spawnSync("git", ["add", "-A"], { cwd: dir, env });
  spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base"], { cwd: dir, env });
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8", env }).stdout.trim();
  return { dir, head, hash: fixtureHash(dir) };
}

test("accepts the exact authorized tree and rejects everything that would move it", () => {
  const { dir, head, hash } = repo();
  try {
    assert.deepEqual(inspectArm({ cwd: dir, baseCommit: head, fixtureHash: hash, planId: "arm" }), {
      ok: true, problems: [], head, fingerprint: hash,
    });

    const headMismatch = inspectArm({ cwd: dir, baseCommit: "0".repeat(40), fixtureHash: hash, planId: "arm" });
    assert.equal(headMismatch.ok, false);
    assert.match(headMismatch.problems.join(" "), /HEAD is/);

    appendFileSync(join(dir, "README.md"), "dirty\n");
    const dirty = inspectArm({ cwd: dir, baseCommit: head, fixtureHash: hash, planId: "arm" });
    assert.equal(dirty.ok, false);
    assert.match(dirty.problems.join(" "), /not clean/);
    spawnSync("git", ["checkout", "-q", "--", "README.md"], { cwd: dir });
    spawnSync("git", ["clean", "-qfd"], { cwd: dir });

    spawnSync("git", ["branch", `prosci/arm/${head.slice(0, 6)}/u1`, head], { cwd: dir });
    const leftover = inspectArm({ cwd: dir, baseCommit: head, fixtureHash: hash, planId: "arm" });
    assert.equal(leftover.ok, false);
    assert.match(leftover.problems.join(" "), /leftover run branches/);

    const forged = inspectArm({ cwd: dir, baseCommit: head, fixtureHash: "0".repeat(16), planId: "arm" });
    assert.equal(forged.ok, false);
    assert.match(forged.problems.join(" "), /fixture fingerprint/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("restores the authorized commit after a run left HEAD somewhere else", () => {
  const { dir, head } = repo();
  try {
    spawnSync("git", ["checkout", "-q", "-b", "integration"], { cwd: dir });
    writeFileSync(join(dir, "src/a.mjs"), "export const a = 2;\n");
    spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "work"], { cwd: dir });
    assert.notEqual(spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim(), head);
    assert.deepEqual(restoreBase(dir, head), { ok: true, head });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
