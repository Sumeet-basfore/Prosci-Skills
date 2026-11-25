import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const LINT = join(dirname(fileURLToPath(import.meta.url)), "..", "skill-lint.mjs");

function pkg({ manifest, reference, bodyIncludes = true }) {
  const dir = mkdtempSync(join(tmpdir(), "lint-"));
  const skill = join(dir, "prosci-test");
  mkdirSync(join(skill, "references"), { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), `---\nname: prosci-test\ndescription: "x"\n---\n\n## Procedure\n\n${bodyIncludes ? "Read `references/guide.md` first." : "Do the thing."}\n\n${"padded ".repeat(300)}\n`);
  if (reference) writeFileSync(join(skill, reference), "# guide\n");
  if (manifest) writeFileSync(join(skill, "skill.json"), JSON.stringify(manifest));
  return { dir, skill };
}

const good = {
  name: "prosci-test",
  triggers: ["t"], non_triggers: ["n"],
  references: [{ path: "references/guide.md", load_when: "when choosing things" }],
};

const run = (dir) => spawnSync(process.execPath, [LINT, "--skills-dir", dir], { encoding: "utf8" });

test("accepts a well-formed package", () => {
  const { dir } = pkg({ manifest: good, reference: "references/guide.md" });
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  rmSync(dir, { recursive: true, force: true });
});

test("rejects a companion file with no manifest", () => {
  const { dir } = pkg({ manifest: null, reference: "references/guide.md" });
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no skill\.json/);
  rmSync(dir, { recursive: true, force: true });
});

test("rejects a declared reference that is missing on disk", () => {
  const { dir } = pkg({ manifest: good, reference: null });
  const r = run(dir);
  assert.match(r.stderr, /missing on disk/);
  rmSync(dir, { recursive: true, force: true });
});

test("rejects a reference the procedure never names", () => {
  const { dir } = pkg({ manifest: good, reference: "references/guide.md", bodyIncludes: false });
  const r = run(dir);
  assert.match(r.stderr, /never names/);
  rmSync(dir, { recursive: true, force: true });
});

test("rejects a reference path that escapes the package", () => {
  const escaping = { ...good, references: [{ path: "references/../../etc/passwd", load_when: "malicious" }] };
  const { dir } = pkg({ manifest: escaping, reference: null });
  const r = run(dir);
  assert.match(r.stderr, /escapes the skill directory|must live under references/);
  rmSync(dir, { recursive: true, force: true });
});

test("accepts a skill with no manifest and no companions", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-"));
  const skill = join(dir, "prosci-plain");
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), `---\nname: prosci-plain\n---\n\n## Procedure\n\n${"body ".repeat(400)}\n`);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  rmSync(dir, { recursive: true, force: true });
});
