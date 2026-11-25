# Verifying a CLI

The surface is the command a user types. Verify exit codes, stdout, stderr and files on disk — separately.

## 1. Write the checks first

```
check: report --total data/sales.txt   → stdout "350", exit 0
check: report --total empty.txt        → non-zero exit, message names the file
check: report                          → usage on stderr, exit 2
check: report --total missing.txt      → error mentions the path, exit 1
```

Four checks, four claims. A run that only does the first has verified the demo path.

## 2. What to capture

| property | why it matters |
| --- | --- |
| exit code | the only signal scripts can rely on |
| stdout | the machine-readable contract |
| stderr | the human-readable failure; must not be empty on failure |
| files created/changed | the side effect nobody checks |
| idempotency | running twice must not duplicate or corrupt |

## 3. Failure paths to try

- Missing argument, unknown flag, `--help`, `--version`.
- Empty input, malformed input, input from stdin vs path.
- Read-only target, permission denied, disk-full simulated where cheap.
- Interrupt (SIGINT) mid-write: is the output partial and is that detectable?

## 4. Comparing against the requirement

State the requirement's exact words. "Prints the sum" does not say whether a trailing newline matters,
whether an empty file prints 0, or whether a bad row aborts or skips. Where the requirement is silent, say
it is silent and record the behaviour you observed; that is a finding for the owner.

## 5. Evidence

Paste the command, its stdout/stderr, and its exit code. `$?` after a pipe is the pipeline's status, not
the command's — capture it correctly (`cmd; echo $?`, or `set -o pipefail`).

## Checklist

- [ ] happy path, empty input, missing input, bad flag
- [ ] exit codes captured per check
- [ ] side effects inspected
- [ ] requirement quoted, differences named
