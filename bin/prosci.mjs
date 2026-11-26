#!/usr/bin/env node
// npx entry point for Prosci. Installs the bundled skills into one or more harness directories.
//
//   npx prosci                          show usage
//   npx prosci --harness pi             install into ~/.agents/skills
//   npx prosci --all                    install into every supported harness directory
//   npx prosci --check                  list what is installed, change nothing
//   npx prosci --remove --harness pi    remove only what this installer created
//
// The skills are copied, not linked: npx runs from a temporary cache that may be removed later.
// Every safety rule lives in bin/install-skills; this wrapper only fans out across harnesses.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTALLER = join(HERE, "install-skills");
const HARNESSES = ["pi", "claude", "codex", "cursor", "opencode"];

const argv = process.argv.slice(2);
const value = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};

const wanted = [];
let rest = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--harness") {
    wanted.push(argv[i + 1]);
    i += 1;
  } else if (argv[i] === "--all") {
    wanted.push(...HARNESSES);
  } else if (argv[i] === "--help" || argv[i] === "-h") {
    wanted.length = 0;
    rest = ["--help"];
  } else {
    rest.push(argv[i]);
  }
}

if (rest.includes("--help") || wanted.length === 0) {
  console.log(`Prosci — a software factory for coding agents

Usage:
  npx prosci --harness <name>   install into one harness (${HARNESSES.join(", ")})
  npx prosci --all              install into every harness directory
  npx prosci --check            list installed skills, change nothing
  npx prosci --remove           remove what this installer created
  npx prosci --dry-run          show what would change

Options:
  --harness <name>   may be repeated
  --all              all five supported harness directories
  --copy             accepted for compatibility; npx installs always copy
  --target <dir>     install into an explicit directory instead of a harness

Installed skills are copied. Pass --remove with the same --harness to uninstall.`);
  process.exit(rest.includes("--help") ? 0 : 2);
}

// --target bypasses harness detection and is forwarded once.
const target = value("--target");
if (target) {
  const result = spawnSync(process.execPath, [INSTALLER, ...argv, ...(rest.includes("--copy") ? [] : ["--copy"])], { stdio: "inherit" });
  process.exit(result.status ?? 1);
}

let failed = 0;
for (const harness of wanted) {
  if (!HARNESSES.includes(harness)) {
    console.error(`unknown harness '${harness}'. known: ${HARNESSES.join(", ")}`);
    failed = 1;
    continue;
  }
  const args = [INSTALLER, "--harness", harness, ...rest.filter((a) => a !== "--copy" && a !== "--harness"), "--copy"];
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) failed = result.status ?? 1;
}
process.exit(failed);
