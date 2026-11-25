#!/bin/sh
set -eu
cat > src/money.mjs <<'JS'
export function formatCents(cents) {
  return (cents / 100).toFixed(2);
}
JS
for m in receipt invoice refund; do
  base=$(echo "$m" | sed 's/^./\U&/')
  cat > "src/$m.mjs" <<JS
import { formatCents } from "./money.mjs";

export function ${m}Line(item) {
  return "${m}: " + item.name + " = " + formatCents(item.cents);
}
JS
done
