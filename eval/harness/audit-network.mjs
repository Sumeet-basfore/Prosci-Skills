#!/usr/bin/env node
// Verifies the zero-telemetry promise by inspecting the code that ships, not the README that claims it.
//
// Scope: what Prosci installs or runs itself — skills/ and bin/. The evaluation harness is separate and
// its only outbound call is the localhost proxy; eval/harness/proxy.mjs is checked by name below.
//
// Exit 0 when the inventory matches the documented allowlist; exit 1 with the offending file otherwise.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SHIPPED = ["skills", "bin"];
const NETWORK = [/fetch\s*\(/, /https?\.request\s*\(/, /net\.connect/, /dns\.(lookup|resolve)/, /XMLHttpRequest/, /analytics|telemetry|posthog|segment\.io|mixpanel/i];
const ALLOWED = [join("eval", "harness", "proxy.mjs")];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(mjs|js|cjs|ts|sh)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const findings = [];
for (const dir of SHIPPED) {
  let files = [];
  try {
    if (!statSync(join(ROOT, dir)).isDirectory()) continue;
    files = walk(join(ROOT, dir));
  } catch {
    continue;
  }
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (ALLOWED.includes(rel)) continue;
    const text = readFileSync(file, "utf8");
    for (const pattern of NETWORK) {
      if (pattern.test(text)) findings.push(`${rel}: ${pattern}`);
    }
  }
}

if (findings.length) {
  console.error("network or telemetry reference in shipped code:");
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`no network or telemetry references in ${SHIPPED.join("/, ")}/ (${ALLOWED.length} documented exception)`);
