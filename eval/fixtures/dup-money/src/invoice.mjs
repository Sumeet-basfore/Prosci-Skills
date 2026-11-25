export function invoiceLine(item) {
  const amount = (item.cents / 100).toFixed(2);
  return "invoice: " + item.name + " = " + amount;
}
