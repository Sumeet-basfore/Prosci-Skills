#!/usr/bin/env node
// Ask a proxy which execution it serves, before any worker is allowed to spend against it.
//
// The controller reads the answer from a file: shipped code stays network-free, while the harness — which
// already owns the only outbound path — does the asking.

import { writeFileSync } from "node:fs";

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
  if (!identity.budgetFile) problems.push("proxy has no budget file; requests would be unmetered");
  return { ok: problems.length === 0, problems, identity };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const flag = (name, fallback = null) => {
    const i = process.argv.indexOf(`--${name}`);
    return i === -1 ? fallback : process.argv[i + 1];
  };
  const url = flag("url");
  const executionId = flag("execution-id");
  const planHash = flag("plan-hash");
  const file = flag("file");
  if (!url || !executionId) {
    console.error("usage: proxy-identity --url <url> --execution-id <id> [--plan-hash <hash> --file <path>]");
    process.exit(2);
  }
  const result = await verifyProxyIdentity(url, { executionId, planHash });
  if (!result.ok) {
    console.error(`proxy refused: ${result.problems.join(" | ")}`);
    process.exit(3);
  }
  if (file) writeFileSync(file, JSON.stringify(result.identity, null, 2));
  console.log(JSON.stringify(result));
}
