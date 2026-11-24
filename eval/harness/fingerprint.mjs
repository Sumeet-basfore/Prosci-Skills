#!/usr/bin/env node
// Write or check the skill fingerprint. Canonical location: eval/skills.lock.json.
//
//   node eval/harness/fingerprint.mjs           write
//   node eval/harness/fingerprint.mjs --check   exit 1 on any drift

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EVAL_DIR, fingerprintSkills, humanPath } from "./lib.mjs";

const lockPath = join(EVAL_DIR, "skills.lock.json");
const skills = fingerprintSkills();
const current = { generatedBy: "eval/harness/fingerprint.mjs", count: skills.length, skills };

if (process.argv.includes("--check")) {
  if (!existsSync(lockPath)) {
    console.error(`${humanPath(lockPath)} is missing. Run: node eval/harness/fingerprint.mjs`);
    process.exit(1);
  }
  const locked = JSON.parse(readFileSync(lockPath, "utf8"));
  const byName = new Map(locked.skills.map((s) => [s.name, s]));
  const problems = [];
  for (const skill of skills) {
    const prior = byName.get(skill.name);
    if (!prior) problems.push(`${skill.name}: not in the lockfile`);
    else if (prior.sha256 !== skill.sha256) problems.push(`${skill.name}: changed since the baseline`);
    if (skill.declared !== skill.name) problems.push(`${skill.name}: declares name '${skill.declared}'`);
  }
  for (const prior of locked.skills) if (!skills.find((s) => s.name === prior.name)) problems.push(`${prior.name}: in the lockfile but gone`);
  for (const p of problems) console.log(`DRIFT ${p}`);
  console.log(`${skills.length} skills, ${problems.length} drift`);
  process.exit(problems.length ? 1 : 0);
}

writeFileSync(lockPath, `${JSON.stringify(current, null, 2)}\n`);
console.log(`wrote ${humanPath(lockPath)} with ${skills.length} skills`);
