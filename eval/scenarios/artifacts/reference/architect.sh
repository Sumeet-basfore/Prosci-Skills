#!/bin/sh
set -eu
mkdir -p docs/adr
cat > docs/adr/0001-discount-ownership.md <<'MD'
# 0001 Discounting lives with the module that owns orders

## Context

`pricing.mjs` holds `applyDiscount`. `orders.mjs` computes totals. Two call sites exist and both
start from an order.

## Options

Option 1: keep discounting in `pricing.mjs`, called from `orders.mjs`.

```js
export function applyDiscount(cents, percent) { return Math.round(cents * (1 - percent / 100)); }
```

Option 2: move discounting into `orders.mjs`.

```js
export function orderTotal(order) { /* applies discount inline */ }
```

## Decision

Option 2. Both call sites begin with an order, so the discount has no independent caller.

## Consequences

Reversing costs one file move while `pricing.mjs` has a single caller. After a second consumer appears,
the cost doubles. Verified with `node --test`.
MD
