#!/bin/sh
set -eu
python3 - <<'PY'
p = "bin/install-skills"
s = open(p).read()
old = "const names = skillNames();"
new = '''if (!existsSync(SKILLS)) {
  console.error("no skills found: expected a skills/ directory next to bin/");
  process.exit(2);
}
const names = skillNames();'''
assert old in s
open(p, "w").write(s.replace(old, new, 1))
PY
