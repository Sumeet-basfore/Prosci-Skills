export function parseLimit(raw) {
  return Number(raw) || 10;
}

export function isPositive(n) {
  return n > 0;
}
