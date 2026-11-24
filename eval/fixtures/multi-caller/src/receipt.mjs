import { formatCents } from "./money.mjs";

export function receiptLine(item) {
  return `${item.name}: ${formatCents(item.cents)}`;
}
