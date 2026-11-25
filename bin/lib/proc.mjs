// Child processes that can be killed as a tree.
//
// A worker spawns tools (pi spawns bash), so killing the pid you started leaves descendants running. Each
// worker is started in its own process group and the whole group is signalled.

import { spawn } from "node:child_process";

export function spawnGroup(command, args, options = {}) {
  const child = spawn(command, args, { ...options, detached: true, stdio: options.stdio ?? ["ignore", "pipe", "pipe"] });
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  const stdout = [];
  const stderr = [];
  child.stdout?.on("data", (c) => stdout.push(c));
  child.stderr?.on("data", (c) => stderr.push(c));
  const done = new Promise((resolve) => {
    child.on("error", (error) => resolve({ code: null, error, stdout: stdout.join(""), stderr: stderr.join(""), pgid: child.pid, killed: false }));
    child.on("close", (code, signal) => resolve({
      code, signal, stdout: stdout.join(""), stderr: stderr.join(""), pgid: child.pid, killed: signal === "SIGKILL" || signal === "SIGTERM",
    }));
  });
  return { child, pgid: child.pid, done, kill: () => killGroup(child.pid) };
}

// Signal the whole group, then confirm it is gone. Returns whether anything was alive.
export function killGroup(pgid) {
  if (!pgid) return false;
  let alive = false;
  try { process.kill(-pgid, "SIGTERM"); alive = true; } catch { alive = false; }
  for (let i = 0; i < 50; i += 1) {
    if (!groupAlive(pgid)) return alive;
    // Busy-wait in small slices: the caller is synchronous by design, and a group that survives SIGTERM
    // must not be given unlimited grace.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  try { process.kill(-pgid, "SIGKILL"); } catch { /* already gone */ }
  return alive;
}

export function groupAlive(pgid) {
  if (!pgid) return false;
  try {
    process.kill(-pgid, 0);
    return true;
  } catch {
    return false;
  }
}
