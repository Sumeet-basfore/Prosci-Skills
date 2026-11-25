#!/bin/sh
set -eu
cat >> src/pricing.mjs <<'JS'

export function discounts(lines, percent) {
  return lines.map((line) => Math.round(line.cents * (1 - percent / 100)));
}
JS
cat > SPEC-CHANGE.md <<'MD'
# Spec: discounts()

- **goal**: apply a percentage discount to each line and return the discounted cents
- **non-goals**: no stacking, no rounding policy beyond nearest cent, no UI
- **input → output**: `[{ cents }], percent` → `[cents]`; e.g. `[1000], 10` → `[900]`
- **constraint**: existing callers of `applyDiscount` must not change
- **proof**: `node --test` plus a direct import check
- **rollback**: revert the two added exports; no data change
MD
