export function refundLine(item) {
  const amount = (item.cents / 100).toFixed(2);
  return "refund: " + item.name + " = " + amount;
}
