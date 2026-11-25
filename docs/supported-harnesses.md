# Supported harnesses

Prosci installs the same directory of skills into each harness's skills path. What differs is how each
harness discovers and loads them, and how much of that is verified.

| harness | skills directory | filesystem check | skill discovery | behaviour |
| --- | --- | --- | --- | --- |
| pi | `~/.agents/skills` | verified | verified inside the sandbox with an explicit `--skill` path | measured: 11/15 route loads (see `eval/reports/phase-0.2.md`) |
| claude | `~/.claude/skills` | verified | **not tested** | not tested |
| codex | `~/.codex/skills` | verified | **not tested** | not tested |
| cursor | `~/.cursor/skills` | verified | **not tested** | not tested |
| opencode | `~/.config/opencode/skills` | verified | **not tested** | not tested |

"Filesystem check" is `eval/harness/install.mjs`: install, re-install, `--check`, `--remove`, and a
marker file, all against a throwaway directory. It proves the files land and that every relative
`../prosci-x/SKILL.md` reference resolves. It proves nothing about whether the harness loads them.

"Discovery" means the harness itself finds the skills without an explicit path. On pi this required
passing `--skill` explicitly: a scoped agent directory did not discover `docs` skills on its own
(`eval/reports/phase-0.2.md` §5). For the other four, that is **unverified** — an untested claim is worse
than an untested gap.

## Install

```sh
bin/install-skills --check                  # what is installed where; changes nothing
bin/install-skills --harness pi             # link into ~/.agents/skills
bin/install-skills --target <dir> --copy    # copy anywhere, for a sandbox
bin/install-skills --harness pi --remove    # remove only what this script installed
```

Removal is marker-based: the installer writes `.prosci-install.json` and `--remove` deletes only the
entries it recorded, so a hand-placed skill in the same directory is left alone. An interrupted install
is repaired by the next run.

## Add a harness

A harness needs a skills directory and the ability to read `SKILL.md` files under it. Add the path to
`bin/install-skills`, add a row here with "not tested" until it is, and run
`node eval/harness/install.mjs` to confirm the filesystem side.
