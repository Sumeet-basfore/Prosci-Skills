// Deterministic stand-in for an agent, run as a real child process so the controller exercises process
// creation, process-group kill and concurrent windows the same way it will with a real worker.
//
//   node fake-worker.mjs '<json>{ "outcome": "...", "files": { "path": "content" }, "delayMs": 0 }'
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const spec = JSON.parse(process.argv[2] ?? "{}");
const cwd = process.cwd();
if (spec.delayMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, spec.delayMs);

if (spec.outcome === "crash") {
  process.stderr.write("fake worker: intentional crash\n");
  process.exit(7);
}
if (spec.outcome === "invalid") {
  process.stdout.write("this is not json\n");
  process.exit(0);
}
for (const [file, content] of Object.entries(spec.files ?? {})) {
  const path = join(cwd, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
if (spec.outcome === "hang") {
  // Sleep far past any test deadline; the controller must kill this process group.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120000);
}
if (spec.outcome === "fail") process.exit(3);
process.stdout.write(JSON.stringify({ ok: true }) + "\n");
