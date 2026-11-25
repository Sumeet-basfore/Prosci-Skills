// Shared pieces for the evaluation harness. No dependencies.
//
// Everything here reads the repo as it is on disk. Nothing writes outside eval/runs or the paths a
// caller names.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

export const EVAL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const REPO_ROOT = dirname(EVAL_DIR);
export const SKILLS_DIR = join(REPO_ROOT, "skills");
export const ROUTER = join(SKILLS_DIR, "prosci", "SKILL.md");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { code: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

// The nine skill folders, each with the hash of its SKILL.md. The fingerprint is the contract the
// installer and the baseline tag are checked against.
function filesUnder(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full, base) : [relative(base, full)];
  });
}

// Every file in the package is hashed, not only SKILL.md: a reference can drift while the body stays the
// same, and the lockfile is supposed to be the contract between the repo and the install.
export function fingerprintSkills() {
  const names = readdirSync(SKILLS_DIR).filter((n) => n === "prosci" || n.startsWith("prosci-")).sort();
  return names.map((name) => {
    const dir = join(SKILLS_DIR, name);
    const text = readFileSync(join(dir, "SKILL.md"), "utf8");
    const declared = /^name:\s*(\S+)/m.exec(text)?.[1] ?? null;
    const files = filesUnder(dir)
      .sort()
      .map((file) => ({ path: file, sha256: sha256(readFileSync(join(dir, file), "utf8")) }));
    return { name, declared, sha256: sha256(text), bytes: text.length, files };
  });
}

// Parse the router table out of the router skill. Rows are the unit L1 reasons about.
export function routerRows() {
  const text = readFileSync(ROUTER, "utf8");
  const section = text.split(/^## Route$/m)[1]?.split(/^## /m)[0] ?? "";
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|") || /^\|\s*-+/.test(line) || /^\|\s*the request/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const routes = [...line.matchAll(/prosci(?:-[a-z]+)?/g)].map((m) => m[0]);
    const unique = [...new Set(routes)].filter((r) => r !== "prosci" || line.includes("/SKILL.md"));
    rows.push({ text: cells[0].replace(/`/g, ""), first: cells[2] ?? "", routes: unique });
  }
  return rows;
}

export function skillsLinkedFrom(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n === "prosci" || n.startsWith("prosci-")).sort();
}

// Every relative ../prosci-x/SKILL.md reference inside a skill file, resolved from that file.
export function relativeRefs(skillDir) {
  const file = join(skillDir, "SKILL.md");
  const text = readFileSync(file, "utf8");
  const refs = [...text.matchAll(/\.\.\/([a-z-]+)\/SKILL\.md/g)].map((m) => m[1]);
  return [...new Set(refs)].map((ref) => ({
    ref,
    target: resolve(dirname(file), "..", ref, "SKILL.md"),
  }));
}

export function loadScenarios(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(join(dir, f)));
}

export function scenarioDir(layer) {
  return join(EVAL_DIR, "scenarios", layer);
}

// Structured records from a Pi json-mode run. Prose is available, but every check that claims an
// action happened reads toolCalls, which carry the tool name, its arguments, and its result.
export function parsePiRun(jsonlPath) {
  const text = readFileSync(jsonlPath, "utf8");
  const calls = [];
  const assistant = [];
  const errors = [];
  let usage = null;
  let session = null;

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "session") session = event;
    if (event.type !== "message_end") continue;
    const message = event.message ?? {};
    if (message.role === "assistant") {
      if (message.usage) usage = message.usage;
      if (message.errorMessage) errors.push(message.errorMessage);
      const blocks = Array.isArray(message.content) ? message.content : [];
      for (const block of blocks) {
        if (block.type === "toolCall") calls.push({ name: block.name, args: block.arguments ?? {}, result: null });
        if (block.type === "text" && block.text) assistant.push(block.text);
      }
    }
    if (message.role === "toolResult") {
      const blocks = Array.isArray(message.content) ? message.content : [];
      const out = blocks.map((b) => b.text ?? "").join("\n");
      for (let i = calls.length - 1; i >= 0; i -= 1) {
        if (calls[i].result === null) {
          calls[i].result = out;
          break;
        }
      }
    }
  }

  return {
    session,
    calls,
    assistantText: assistant.join("\n"),
    usage,
    errors,
    cost: usage?.cost?.total ?? null,
    bashCalls: calls.filter((c) => c.name === "bash"),
    toolNames: [...new Set(calls.map((c) => c.name))],
  };
}

// A command was genuinely run when a bash tool record exists whose command contains the given
// fragment. Transcript mentions are deliberately not accepted.
export function ranCommand(run, fragment) {
  return run.bashCalls.some((c) => {
    const cmd = c.args.command ?? c.args.cmd ?? "";
    return typeof cmd === "string" && cmd.includes(fragment);
  });
}

export function executedDangerousCommands(run, patterns) {
  return run.bashCalls.filter((c) => {
    const cmd = c.args.command ?? c.args.cmd ?? "";
    return typeof cmd === "string" && patterns.some((p) => p.test(cmd));
  });
}

export function tail(text, lines = 20) {
  return text.split("\n").slice(-lines).join("\n");
}

export function humanPath(p) {
  return relative(REPO_ROOT, p) || ".";
}

// Which files a run touched. git status prints a two-character status prefix, and three separate
// bugs came from slicing it (D-003), so this asks git for bare paths only.
export function changedFiles(workspace, base = "HEAD") {
  // A merge changes history, not the tree, so "diff against HEAD" reports nothing. Callers that need
  // the integrated changes pass the pre-integration base instead.
  const run = (args) => git(args, workspace).out.split("\n").map((line) => line.trim());
  const paths = [...run(["ls-files", "--modified", "--others", "--exclude-standard"]), ...run(["diff", "--name-only", base])];
  return paths.filter((v, i, all) => v && all.indexOf(v) === i).sort();
}

// Some skills produce a reply, not a file: a challenge report, a verification result. The assertion is
// still mechanical — the named defect either appears in the text or it does not.
export function replyMatches(text, patterns) {
  return (patterns ?? []).map((pattern) => {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    return { pattern: String(pattern), ok: re.test(text ?? "") };
  });
}

// A reply assertion must test a property, not the wording of one reference answer. Every paraphrase of
// the correct answer must match; a bland approval and a substantively wrong answer must each miss at
// least one pattern. Three phases produced assertions that failed this, at the cost of a paid run each.
export function lintReplyAssertion(scenario) {
  const patterns = scenario.reply_contains ?? [];
  const problems = [];
  if (!patterns.length) return { ok: false, problems: ["no reply_contains patterns"] };
  const paraphrases = scenario.paraphrases ?? [];
  if (paraphrases.length < 2) problems.push(`needs at least two paraphrases, has ${paraphrases.length}`);
  for (const [i, text] of paraphrases.entries()) {
    const missed = replyMatches(text, patterns).filter((r) => !r.ok);
    if (missed.length) problems.push(`paraphrase ${i + 1} misses ${missed.map((m) => m.pattern).join(", ")}`);
  }
  for (const [label, text] of [["bland", scenario.bland_reply], ["wrong", scenario.wrong_reply]]) {
    if (text === undefined) { problems.push(`no ${label} reply`); continue; }
    if (replyMatches(text, patterns).every((r) => r.ok)) problems.push(`the ${label} reply passes, so the assertion cannot detect it`);
  }
  return { ok: problems.length === 0, problems };
}
