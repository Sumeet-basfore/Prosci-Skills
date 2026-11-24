import { formatCents } from "./money.mjs";

export function invoiceLine(item) {
  return `INV ${item.name} = ${formatCents(item.cents)}`;
}
