// Guards that must pass before an experimental arm spends anything.
//
// E3b ran a second arm against the first arm's proxy and its integration branch. Both were silent: the
// controller read its own budget file and its own HEAD, and neither had to agree with the arm that was
// authorized. These checks make the mismatch a refusal instead of a result.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function git(cwd, args) {
  const out = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { ok: out.status === 0, stdout: (out.stdout ?? "").trim(), stderr: (out.stderr ?? "").trim() };
}

// Content fingerprint of the tracked tree. The commit id also covers history and timestamps; this says the
// files the workers see are the fixture the plan names, even when the repo was rebuilt from a copy.
export function fixtureHash(cwd) {
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" });
  if (listed.status !== 0) throw new Error(`not a git tree: ${cwd}`);
  const files = listed.stdout.split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(`${cwd}/${file}`));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

// Everything that would make a run start somewhere other than the authorized snapshot.
export function inspectArm({ cwd, baseCommit, fixtureHash: expectedHash, planId }) {
  const problems = [];
  const head = git(cwd, ["rev-parse", "HEAD"]);
  if (!head.ok) return { ok: false, problems: [`not a git repository: ${cwd}`], head: null, fingerprint: null };
  if (head.stdout !== baseCommit) problems.push(`HEAD is ${head.stdout}, plan authorizes ${baseCommit}`);
  const dirty = git(cwd, ["status", "--porcelain", "--untracked-files=all"]);
  if (dirty.stdout) problems.push(`working tree is not clean: ${dirty.stdout.split("\n").slice(0, 3).join("; ")}`);
  if (planId) {
    const leftover = git(cwd, ["branch", "--list", `prosci/${planId}/*`]);
    if (leftover.stdout) problems.push(`leftover run branches: ${leftover.stdout.split("\n").length}`);
  }
  const actualHash = fixtureHash(cwd);
  if (expectedHash && actualHash !== expectedHash) problems.push(`fixture fingerprint ${actualHash}, plan authorizes ${expectedHash}`);
  return { ok: problems.length === 0, problems, head: head.stdout, fingerprint: actualHash };
}

export function restoreBase(cwd, baseCommit) {
  git(cwd, ["checkout", "-q", "--detach", baseCommit]);
  const head = git(cwd, ["rev-parse", "HEAD"]).stdout;
  return { ok: head === baseCommit, head };
}

// The proxy is the other half of the authorization. Its identity has to name this execution before a
// worker can spend against it.
export async function verifyProxyIdentity(baseUrl, { executionId, planHash }) {
  let identity;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/__identity`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return { ok: false, problems: [`identity endpoint answered ${response.status}`], identity: null };
    identity = await response.json();
  } catch (error) {
    return { ok: false, problems: [`proxy unreachable at ${baseUrl}: ${String(error?.message ?? error)}`], identity: null };
  }
  const problems = [];
  if (identity.executionId !== executionId) problems.push(`proxy belongs to execution ${identity.executionId}, not ${executionId}`);
  if (planHash && identity.planHash !== planHash) problems.push(`proxy is bound to plan ${identity.planHash}, not ${planHash}`);
  if (identity.budgetFile === null) problems.push("proxy has no budget file; requests would be unmetered");
  return { ok: problems.length === 0, problems, identity };
}
