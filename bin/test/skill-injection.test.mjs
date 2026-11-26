import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildWorkerInstructions, checkContext, loadAssignedSkills, resolveSkill, skillsFingerprint } from "../lib/skill-injection.mjs";

function packageRoot() {
  const root = mkdtempSync(join(tmpdir(), "skills-"));
  const write = (name, body) => {
    mkdirSync(join(root, name), { recursive: true });
    writeFileSync(join(root, name, "SKILL.md"), body);
  };
  write("prosci-bar", "# bar\nSHARED RULE: verify before claiming done.\n");
  write("prosci-arch", "# arch\nARCH ONLY: name two options.\n");
  write("prosci-ship", "# ship\nSHIP ONLY: smallest change.\n");
  write("prosci-review", "# review\nREVIEW ONLY: cite a line.\n");
  return root;
}

const unit = { id: "u1", role: "architect", files: ["docs/a.md"], skills: ["prosci-arch"] };
const role = { write: true, stop_when: ["scope grows"] };

test("delivers the assigned body, excludes unassigned skills, and does not repeat shared rules", () => {
  const root = packageRoot();
  try {
    const shared = [resolveSkill(root, "prosci-bar")];
    const assigned = loadAssignedSkills(root, ["prosci-arch", "prosci-bar", "prosci-arch"]);
    const bundle = buildWorkerInstructions({ unit, role, handoff: "# Handoff\nDo the ADR.", shared, skills: [...shared, ...assigned] });
    assert.match(bundle.text, /ARCH ONLY/);
    assert.match(bundle.text, /SHARED RULE/);
    assert.doesNotMatch(bundle.text, /SHIP ONLY|REVIEW ONLY/);
    assert.equal((bundle.text.match(/SHARED RULE/g) ?? []).length, 1);
    assert.deepEqual(bundle.meta.dropped, ["prosci-bar"]);
    assert.equal(bundle.meta.assigned.length, 1);
    assert.match(bundle.text, /Untrusted data/);
    assert.match(bundle.text, /controller instructions are authoritative/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a changed skill body changes the fingerprint the plan approved", () => {
  const root = packageRoot();
  try {
    const before = skillsFingerprint([resolveSkill(root, "prosci-bar"), ...loadAssignedSkills(root, ["prosci-arch"])]);
    writeFileSync(join(root, "prosci-arch", "SKILL.md"), "# arch\nARCH ONLY: name three options.\n");
    const after = skillsFingerprint([resolveSkill(root, "prosci-bar"), ...loadAssignedSkills(root, ["prosci-arch"])]);
    assert.notEqual(before, after);
    assert.match(after, /^[0-9a-f]{16}$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("refuses an oversized bundle instead of truncating mandatory rules", () => {
  const root = packageRoot();
  try {
    const shared = [resolveSkill(root, "prosci-bar")];
    const bundle = buildWorkerInstructions({ unit, role, handoff: "x".repeat(4000), shared, skills: shared });
    const refused = checkContext({ tokens: bundle.meta.estimatedTokens, contextLimit: 1000 });
    assert.equal(refused.ok, false);
    assert.match(refused.reason, /instruction bundle is/);
    assert.match(bundle.text, /SHARED RULE/, "the bundle itself is untouched when it is refused");
    assert.equal(checkContext({ tokens: 100, contextLimit: 1000 }).ok, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("refuses a skill path that is not a package identifier", () => {
  assert.throws(() => resolveSkill("/tmp", "../../etc"), /not a package identifier/);
});
