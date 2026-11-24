---
name: factory-init
description: "Start or adopt a repo the factory way: inspect what exists, add only the instructions and baseline commands a change needs, and prove the baseline runs. Use when creating a project, or onboarding a repo that has no usable conventions."
---

# Init

The failure this route prevents has two shapes. Starting work in an empty repo that has no way to
verify anything, so the first change is unverifiable. Or scaffolding a repo that already has
conventions, and overwriting them.

Both are avoided the same way. Find out what exists before adding anything.

## 1. Inspect before you create

```sh
ls -a
git log --oneline -5
git status
```

Then read, if they exist: `README.md`, `AGENTS.md`, `CLAUDE.md`, the manifest
(`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), the lockfile, and the CI config.

Decide which of the two shapes you are in.

- **Empty or near empty.** Create the minimum below.
- **Has conventions.** Do not create anything that already exists, and do not restructure. Your
  job is to record what is already true, then prove it runs.

Never overwrite a file, a lockfile, or a config that already exists. If the repo has a formatter
config, that config decides the formatting, not your preference.

## 2. Add only what a change needs

The minimum a repo needs to be workable by an agent:

1. An instructions file, `AGENTS.md` (with `CLAUDE.md` as a symlink to it if the tooling wants
   that name), naming the real commands for test, typecheck, and build.
2. A way to run those commands from a clean checkout. If the toolchain needs an environment, the
   command bootstraps it, or the instructions say how.
3. A test harness with at least one passing test, even a trivial one, so the command exists and is
   green from the first commit. A repo with no test command cannot be verified, by an agent or by
   a person.
4. A `.gitignore` covering build output, dependencies, and secrets.

Nothing else. No framework, no CI pipeline, no lint config with rules nobody will obey, no
directory tree for code that does not exist yet. Add each when the first change needs it.

If the repo has a remote on GitHub, a check that runs the same commands is worth adding. That is
`bin/install-gate` in this factory's repo, or one workflow file by hand.

## 3. Record the commands, then run them

Write the commands into the instructions file, then run each one in an empty environment.

```sh
<install>     # from clean, if the toolchain needs it
<test>
<typecheck>   # if the repo has one
<build>       # if it produces an artifact
```

Paste the output. If a command fails from clean but works on your machine, the repo is not
initialised yet regardless of what the file says.

## 4. Prove the baseline with a first change

Make one real, small change through `../factory-ship/SKILL.md` before declaring the repo ready. The
scaffold is a claim until a change travels through it: edit, test, verify, pull request, merge.

If that first pass reveals a missing step, add it to the instructions file then, not later.

## 5. Say what you did not set up

Name what you deliberately left out and when it should arrive, for example a CI pipeline, a release
route, a lint config, a second package. An unstated omission becomes an invented convention two
weeks later.

## Reply

Which shape the repo was in, what you added and why, the commands and their output from clean, the
first change and its pull request, and what is still unset.
