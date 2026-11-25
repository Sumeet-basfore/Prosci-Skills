#!/usr/bin/env node
// Deterministic checks for the skill package format. No model, no network.
//
// A reference is knowledge, not a promise: if the manifest declares it, the procedure must name it, the
// file must exist, and the path must not escape the package. Skills without a manifest stay valid, so the
// fourteen unchanged skills keep working exactly as before.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, normalize } from "node:path";
import { EVAL_DIR } from "./lib.mjs";

// Overridable so the lint can be tested against synthetic packages.
const argDir = process.argv.indexOf("--skills-dir");
const SKILLS_DIR = argDir > -1 ? process.argv[argDir + 1] : join(EVAL_DIR, "..", "skills");

const problems = [];
const warnings = [];
const names = readdirSync(SKILLS_DIR).filter((n) => n === "prosci" || n.startsWith("prosci-")).sort();

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [relative(base, full)];
  });
}

for (const name of names) {
  const dir = join(SKILLS_DIR, name);
  const body = readFileSync(join(dir, "SKILL.md"), "utf8");
  const manifestPath = join(dir, "skill.json");
  const files = walk(dir);
  const companions = files.filter((f) => f !== "SKILL.md");

  if (!existsSync(manifestPath)) {
    // Backward compatibility: unchanged skills need no manifest. Companions without a manifest are a
    // finding, because nothing declares when they load.
    if (companions.length) problems.push(`${name}: has ${companions.length} companion file(s) but no skill.json`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    problems.push(`${name}: skill.json is not valid JSON (${error.message})`);
    continue;
  }

  if (manifest.name !== name) problems.push(`${name}: manifest name is "${manifest.name}"`);
  if (!Array.isArray(manifest.triggers) || !manifest.triggers.length) problems.push(`${name}: no triggers declared`);
  if (!Array.isArray(manifest.non_triggers) || !manifest.non_triggers.length) problems.push(`${name}: no non_triggers declared`);

  const declared = new Set();
  for (const ref of manifest.references ?? []) {
    const rel = ref.path ?? "";
    const resolved = normalize(join(dir, rel));
    if (!rel.startsWith("references/")) problems.push(`${name}: reference "${rel}" must live under references/`);
    if (rel.includes("..") || !resolved.startsWith(dir)) problems.push(`${name}: reference "${rel}" escapes the skill directory`);
    if (!ref.load_when || ref.load_when.length < 10) problems.push(`${name}: reference "${rel}" has no usable load_when`);
    if (!existsSync(resolved)) problems.push(`${name}: declared reference missing on disk: ${rel}`);
    else {
      declared.add(rel);
      if (!body.includes(rel)) problems.push(`${name}: procedure never names ${rel}, so nothing will read it`);
      // The pointer must appear early enough to act on: a reference mentioned in passing at the end is not
      // a loading instruction. The first decision stage is the line budget that matters.
      const early = body.split("\n").slice(0, 45).join("\n");
      if (!early.includes(rel)) problems.push(`${name}: ${rel} is not named in the first 45 lines, so it is not loaded before the work starts`);
      const lines = readFileSync(resolved, "utf8").split("\n").length;
      if (lines > 250) warnings.push(`${name}: ${rel} is ${lines} lines; guideline is 250`);
    }
  }

  for (const file of files.filter((f) => f.startsWith("references/"))) {
    if (!declared.has(file)) problems.push(`${name}: ${file} exists but is not declared in skill.json`);
  }

  // Critical rules must stay in the body, not only in a reference.
  // Headings differ by skill (numbered steps, "Procedure", "The workflow"). What must exist is a body
  // that carries the rules, not one particular heading.
  if (!/^## /m.test(body) || body.length < 2000) problems.push(`${name}: SKILL.md body is too thin to carry rules`);
}

// Portable paths: a skill must not hard-code a machine-specific location.
for (const name of names) {
  const body = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
  if (/\/home\/[a-z]|\/Users\/[A-Za-z]|[A-Z]:\\/.test(body)) problems.push(`${name}: hard-coded absolute path in SKILL.md`);
}

// Path safety across every skill file.
for (const name of names) {
  for (const file of walk(join(SKILLS_DIR, name))) {
    if (file.includes("..")) problems.push(`${name}: unsafe path in package: ${file}`);
  }
}

if (warnings.length) for (const w of warnings) console.warn(`WARN ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
const withManifest = names.filter((n) => existsSync(join(SKILLS_DIR, n, "skill.json")));
console.log(`${names.length} skills, ${withManifest.length} with manifests, all references declared, named and path-safe`);
