export function orderTotal(order) {
  return order.lines.reduce((n, line) => n + line.cents, 0);
}
