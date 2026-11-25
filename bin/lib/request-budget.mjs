// Atomic request reservations shared by the proxy and the controller.
//
// The proxy forwards provider requests; concurrency means several workers can ask at once. Counting after the
// fact lets them collectively exceed the approved limit, so each request reserves before it is forwarded.
//
// The reservation lives in a file next to the run, guarded by an exclusive lock file. A crashed process leaves
// at most one stale lock, which the next reservation removes after a grace period.

import { readFileSync, writeFileSync, existsSync, openSync, closeSync, unlinkSync, statSync, renameSync } from "node:fs";

const LOCK_STALE_MS = 5000;

function withLock(path, fn) {
  const lock = `${path}.lock`;
  const deadline = Date.now() + 10000; // contention from 20 workers can outlast a short retry loop
  while (true) {
    try {
      const fd = openSync(lock, "wx");
      closeSync(fd);
      break;
    } catch {
      // A lock older than the grace period is a crash, not contention.
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) {
        try { unlinkSync(lock); } catch { /* raced */ }
        continue;
      }
      if (Date.now() > deadline) throw new Error(`request budget lock timeout: ${lock}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
  }
  try {
    return fn();
  } finally {
    try { unlinkSync(lock); } catch { /* already removed */ }
  }
}

export function openBudget(path, limit) {
  return withLock(path, () => {
    if (!existsSync(path)) writeFileSync(path, JSON.stringify({ schema: 1, limit, used: 0 }));
    const record = JSON.parse(readFileSync(path, "utf8"));
    return record;
  });
}

// Reserve one request. Returns { ok, used, limit, remaining }. A denied reservation does not increment.
export function reserve(path) {
  return withLock(path, () => {
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.used >= record.limit) return { ok: false, used: record.used, limit: record.limit, remaining: 0 };
    record.used += 1;
    // Write-then-rename so a reader never sees a half-written budget.
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(record));
    renameSync(tmp, path);
    return { ok: true, used: record.used, limit: record.limit, remaining: record.limit - record.used };
  });
}

export function usage(path) {
  if (!existsSync(path)) return { used: 0, limit: 0, remaining: 0 };
  const record = JSON.parse(readFileSync(path, "utf8"));
  return { used: record.used, limit: record.limit, remaining: Math.max(0, record.limit - record.used) };
}
