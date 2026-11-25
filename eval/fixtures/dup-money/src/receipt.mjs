export function receiptLine(item) {
  const amount = (item.cents / 100).toFixed(2);
  return "receipt: " + item.name + " = " + amount;
}
