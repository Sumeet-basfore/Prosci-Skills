// Shared parser for the factory contract block, so bin/context-doctor and bin/verify
// cannot drift apart. Static checks only. Nothing here executes a command.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const KEYS = ["typecheck", "test", "test1", "build"];
export const RUN_ORDER = ["typecheck", "test", "test1", "build"];
const PLACEHOLDER = "{file}";

export function parseFactoryBlock(markdown) {
  const commands = {};
  const errors = [];
  const match = /```factory[ \t]*\r?\n([\s\S]*?)```/.exec(markdown);
  if (!match) return { commands, errors: ["no-block"] };

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 0) {
      errors.push(`bad-line:${line}`);
      continue;
    }
    const key = line.slice(0, sep).trim();
    const command = line.slice(sep + 1).trim();
    if (!KEYS.includes(key)) {
      errors.push(`unknown-key:${key}`);
      continue;
    }
    if (key in commands) {
      errors.push(`duplicate-key:${key}`);
      continue;
    }
    if (!command) {
      errors.push(`empty-command:${key}`);
      continue;
    }
    commands[key] = command;
  }

  for (const [key, command] of Object.entries(commands)) {
    const hasPlaceholder = command.includes(PLACEHOLDER);
    if (key === "test1" && !hasPlaceholder) errors.push("test1-without-placeholder");
    if (key !== "test1" && hasPlaceholder) errors.push(`placeholder-outside-test1:${key}`);
  }
  // A contract without a full test command cannot gate anything, so it is not a valid contract.
  if (Object.keys(commands).length > 0 && !("test" in commands)) errors.push("no-test-command");

  return { commands, errors };
}

function readPackageJson(repoDir) {
  const file = join(repoDir, "package.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { __invalid: true };
  }
}

function makeTargets(repoDir) {
  const file = join(repoDir, "Makefile");
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").match(/^[A-Za-z0-9_.-]+(?=:)/gm) ?? [];
}

// Returns { errors, warnings }. errors mean the contract names something that cannot resolve.
// warnings mean the repo's environment is not ready yet, which is not a contract mistake.
export function checkCommands(repoDir, commands) {
  const errors = [];
  const warnings = [];
  const pkg = readPackageJson(repoDir);
  const scripts = pkg && !pkg.__invalid ? pkg.scripts ?? {} : null;
  const targets = makeTargets(repoDir);
  const has = (file) => existsSync(join(repoDir, file));
  const nodeDeps = has("node_modules");

  for (const [key, command] of Object.entries(commands)) {
    const [bin, ...args] = command.split(/\s+/);
    if (!bin) {
      errors.push(`empty-command:${key}`);
      continue;
    }
    const unknown = (what) => errors.push(`${key}:${what}`);

    if (bin === "npm") {
      if (!pkg) unknown("no-package-json");
      else if (pkg.__invalid) unknown("invalid-package-json");
      else {
        const sub = args[0];
        if (sub === "test") {
          if (!scripts.test) unknown("no-test-script");
        } else if (sub === "run") {
          const name = args[1];
          if (!name) unknown("npm-run-without-script");
          else if (!(name in scripts)) unknown(`no-script:${name}`);
        } else if (!sub || sub.startsWith("-")) {
          // npm ci / npm install and friends need no script
        } else if (!(sub in scripts)) {
          unknown(`no-script:${sub}`);
        }
      }
      if (!nodeDeps) warnings.push(`${key}:node_modules-missing`);
    } else if (bin === "pnpm" || bin === "yarn") {
      if (!pkg) unknown("no-package-json");
      else {
        const words = args.filter((a) => !a.startsWith("-"));
        const first = words[0];
        const verbs = ["install", "i", "add", "remove", "exec", "dlx", "run", "dlx"];
        if (!first) unknown("no-argument");
        else if (!verbs.includes(first) && !(first in (scripts ?? {}))) {
          const binPath = join(repoDir, "node_modules", ".bin", first);
          if (existsSync(binPath)) {
            // runs a local binary such as turbo
          } else if (!nodeDeps) {
            warnings.push(`${key}:node_modules-missing`);
          } else {
            unknown(`no-script-or-bin:${first}`);
          }
        }
        if (first === "run" && words[1] && !(words[1] in (scripts ?? {}))) {
          unknown(`no-script:${words[1]}`);
        }
      }
    } else if (bin === "npx") {
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) unknown("npx-without-binary");
      else if (has(join("node_modules", ".bin", name))) {
        // local binary installed
      } else if (!nodeDeps) warnings.push(`${key}:node_modules-missing`);
      else warnings.push(`${key}:npx-may-download:${name}`);
    } else if (bin === "cargo") {
      if (!has("Cargo.toml")) unknown("no-cargo-toml");
      if (!has("target")) warnings.push(`${key}:not-built-yet`);
    } else if (bin === "make" || bin === "gmake") {
      const target = args.find((a) => !a.startsWith("-"));
      if (!targets) unknown("no-makefile");
      else if (target && !targets.includes(target)) unknown(`no-target:${target}`);
    } else if (bin === "go") {
      if (!has("go.mod")) unknown("no-go-mod");
    } else if (["pytest", "python", "python3", "py.test", "ruff", "mypy"].includes(bin)) {
      const marker = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"].some(has);
      if (!marker) unknown("no-python-project");
      if (bin === "pytest" && !has(".venv")) warnings.push(`${key}:venv-missing`);
    } else if (bin === "uv") {
      const marker = ["pyproject.toml", "uv.lock", "requirements.txt"].some(has);
      if (!marker) unknown("no-python-project");
      if (!has(".venv")) warnings.push(`${key}:venv-missing`);
    } else if (bin.includes("/")) {
      // an explicit path inside the repo, such as .venv/bin/pytest
      if (!existsSync(join(repoDir, bin))) unknown(`missing-binary:${bin}`);
    } else if (["bash", "sh", "node", "deno", "bun"].includes(bin)) {
      // interpreter driven, nothing static to resolve
    } else {
      warnings.push(`${key}:unchecked-binary:${bin}`);
    }
  }
  return { errors, warnings };
}
