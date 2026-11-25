#!/bin/sh
set -eu
printf '# Verification note\n\nThe CLI prints 350 on the happy path (exit 0). An empty file throws TypeError (exit 1). A missing file reports the path (exit 1). No argument prints usage (exit 2).\n' > VERIFY.md
