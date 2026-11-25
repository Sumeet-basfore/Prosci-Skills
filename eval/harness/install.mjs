#!/usr/bin/env node
// L2: installation compatibility, per harness, in a throwaway HOME. No model, no network.
//
// Three different claims are reported separately, on purpose:
//   filesystem  the files are placed and every relative reference resolves   measured here
//   discovery   the harness itself finds and loads them                      not tested in phase 0
//   behaviour   the harness follows the skill                                phase 1
// Reporting them as one number would be a lie.

import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EVAL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "./lib.mjs";

const INSTALL = join(REPO_ROOT, "bin", "install-skills");
const HARNESSES = ["pi", "claude", "codex", "cursor", "opencode"];
const DIRS = {
  pi: [".agents", "skills"],
  claude: [".claude", "skills"],
  codex: [".codex", "skills"],
  cursor: [".cursor", "skills"],
  opencode: [".config", "opencode", "skills"],
};

const json = process.argv.includes("--json");
const only = process.argv.includes("--harness") ? process.argv[process.argv.indexOf("--harness") + 1] : null;
const rows = [];

for (const harness of only ? [only] : HARNESSES) {
  const home = mkdtempSync(join(tmpdir(), `prosci-l2-${harness}-`));
  const dir = join(home, ...DIRS[harness]);
  const base = { harness, dir: `${"~"}/${DIRS[harness].join("/")}`, filesystem: "fail", discovery: "not tested", behaviour: "phase 1", detail: "" };

  const run = (args) => spawnSync(process.execPath, [INSTALL, ...args], { encoding: "utf8", env: { ...process.env, HOME: home } });
  const install = run(["--harness", harness]);
  if (install.status !== 0) {
    base.detail = (install.stderr || install.stdout).split("\n")[0].slice(0, 120);
    rows.push(base);
    rmSync(home, { recursive: true, force: true });
    continue;
  }

  const names = readdirSync(dir).filter((n) => n.startsWith("prosci")).sort();
  const check = run(["--harness", harness, "--check"]);
  const marker = JSON.parse(readFileSync(join(dir, ".prosci-install.json"), "utf8"));

  // Re-install, then remove, then assert the directory is back to what it was.
  const again = run(["--harness", harness]);
  const removal = run(["--harness", harness, "--remove"]);
  const left = existsSync(dir) ? readdirSync(dir) : [];

  const ok =
    install.status === 0 &&
    // The count is the installed set, read from the lockfile rather than hard-coded, so adding a
    // skill cannot silently leave this check asserting the old number.
    names.length === JSON.parse(readFileSync(join(EVAL_DIR, "skills.lock.json"), "utf8")).count &&
    check.status === 0 &&
    again.status === 0 &&
    removal.status === 0 &&
    left.length === 0 &&
    marker.state === "complete";

  base.filesystem = ok ? "pass" : "fail";
  if (!ok) base.detail = `names=${names.length} check=${check.status} again=${again.status} remove=${removal.status} left=${left.length} marker=${marker.state}`;
  rows.push(base);
  rmSync(home, { recursive: true, force: true });
}

if (json) {
  console.log(JSON.stringify({ rows, summary: { harnesses: rows.length, filesystem: rows.filter((r) => r.filesystem === "pass").length } }, null, 2));
} else {
  console.log(`${"harness".padEnd(9)} ${"dir".padEnd(28)} ${"filesystem".padEnd(11)} ${"discovery".padEnd(11)} behaviour`);
  for (const r of rows) {
    console.log(`${r.harness.padEnd(9)} ${r.dir.padEnd(28)} ${r.filesystem.padEnd(11)} ${r.discovery.padEnd(11)} ${r.behaviour}${r.detail ? `   ${r.detail}` : ""}`);
  }
  console.log(`\n${rows.filter((r) => r.filesystem === "pass").length}/${rows.length} harnesses pass the filesystem check`);
  console.log("discovery is not tested in phase 0: it needs the harness itself to load a skill");
  console.log("omp has no skills directory on this machine and is unsupported");
}

process.exit(rows.every((r) => r.filesystem === "pass") ? 0 : 1);
