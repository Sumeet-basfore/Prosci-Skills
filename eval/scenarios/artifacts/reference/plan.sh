#!/bin/sh
set -eu
mkdir -p docs/plan
cat > docs/plan/discount-move.md <<'MD'
# Move discounting into orders

## Units

- [ ] Unit 1: copy `applyDiscount` into `orders.mjs`. Check: `node --test`. Rollback: delete the copy.
- [ ] Unit 2: switch the two call sites. Depends on Unit 1. Check: `node --test`. Rollback: revert the calls.
- [ ] Unit 3: delete `pricing.mjs`. Depends on Unit 2. Check: `node --test`. Rollback: restore the file.

## Parallel

Units 1 and 3 cannot run in parallel; Unit 3 depends on Unit 2. No parallel group exists for this move.
MD
