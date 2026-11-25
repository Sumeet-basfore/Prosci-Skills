export function applyDiscount(cents, percent) {
  return Math.round(cents * (1 - percent / 100));
}
