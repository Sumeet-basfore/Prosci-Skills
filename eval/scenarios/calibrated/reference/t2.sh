#!/bin/sh
set -eu
python3 - <<'PY'
import json, re
p = "bin/verify"
s = open(p).read()
old = 'const asJson = hasFlag("--json");'
# --version needs the import the file may not have yet.
new = old + """
if (hasFlag("--version")) {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}"""
assert old in s
s = s.replace(old, new, 1)
if "readFileSync" not in s.split("\n")[0] and "readFileSync" not in s:
    s = 'import { readFileSync } from "node:fs";\n' + s
elif "readFileSync" not in s.split("\n\n")[0] and "import { readFileSync" not in s:
    s = 'import { readFileSync } from "node:fs";\n' + s
open(p, "w").write(s)
pkg = json.load(open("package.json"))
pkg["version"] = "0.0.1"
json.dump(pkg, open("package.json", "w"), indent=1)
PY
