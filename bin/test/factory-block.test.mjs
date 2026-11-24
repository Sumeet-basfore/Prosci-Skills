// Behaviour tests for the contract parser and the doctor CLI. Fixtures are built in temp dirs
// so the tests do not depend on which projects exist on this machine.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { parseFactoryBlock, checkCommands } from "../lib/factory-block.mjs";

const binDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "factory-"));
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}

const nodeRepo = (scripts) =>
  fixture({
    "package.json": JSON.stringify({ name: "x", scripts }),
    "AGENTS.md": "```factory\ntypecheck: npm run typecheck\ntest: npm test\n```\n",
  });

test("parses a well formed block", () => {
  const { commands, errors } = parseFactoryBlock("text\n```factory\n# note\ntest: npm test\n```\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(commands, { test: "npm test" });
});

test("no block is an error", () => {
  assert.deepEqual(parseFactoryBlock("just prose").errors, ["no-block"]);
});

test("unknown key, duplicate key, and bad line are errors", () => {
  const { errors } = parseFactoryBlock("```factory\ntypo: x\ntest: a\ntest: b\nnonsense\n```\n");
  assert.deepEqual(errors, ["unknown-key:typo", "duplicate-key:test", "bad-line:nonsense"]);
});

test("{file} is required on test1 and forbidden elsewhere", () => {
  assert.deepEqual(parseFactoryBlock("```factory\ntest: a\ntest1: b\n```\n").errors, ["test1-without-placeholder"]);
  assert.deepEqual(parseFactoryBlock("```factory\ntest: a {file}\n```\n").errors, ["placeholder-outside-test1:test"]);
});

test("an npm script that does not exist is a contract error", () => {
  const dir = nodeRepo({ test: "vitest run" });
  const { errors } = checkCommands(dir, { typecheck: "npm run typecheck", test: "npm test" });
  assert.deepEqual(errors, ["typecheck:no-script:typecheck"]);
});

test("missing node_modules is a warning, not an error", () => {
  const dir = nodeRepo({ test: "vitest run" });
  const { errors, warnings } = checkCommands(dir, { test: "npm test" });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, ["test:node_modules-missing"]);
});

test("make with an unknown target is an error", () => {
  const dir = fixture({ Makefile: "build:\n\techo ok\ntest:\n\techo ok\n" });
  assert.deepEqual(checkCommands(dir, { test: "make test" }).errors, []);
  assert.deepEqual(checkCommands(dir, { test: "make nope" }).errors, ["test:no-target:nope"]);
});

test("python commands need a python project", () => {
  const withPy = fixture({ "pyproject.toml": "[project]\nname='x'\n" });
  const noPy = fixture({ "README.md": "x" });
  assert.deepEqual(checkCommands(withPy, { test: "pytest -q" }).errors, []);
  assert.deepEqual(checkCommands(noPy, { test: "pytest -q" }).errors, ["test:no-python-project"]);
});

test("doctor exits 1 on a repo without a block and 0 on a valid one", () => {
  const root = fixture({
    "projects/good/package.json": JSON.stringify({ scripts: { test: "node -e ''" } }),
    "projects/good/AGENTS.md": "```factory\ntest: npm test\n```\n",
    "projects/bad/AGENTS.md": "no contract here\n",
    "projects/bad/.git/HEAD": "ref: refs/heads/main\n",
    "projects/good/.git/HEAD": "ref: refs/heads/main\n",
  });
  const run = spawnSync(process.execPath, [join(binDir, "context-doctor"), "--root", root], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /bad\s+FAIL\s+no-block/);
  assert.match(run.stdout, /good\s+PASS\s+test/);

  const onlyGood = spawnSync(process.execPath, [join(binDir, "context-doctor"), "--root", root, "--repos", "good"], { encoding: "utf8" });
  assert.equal(onlyGood.status, 0);
});
