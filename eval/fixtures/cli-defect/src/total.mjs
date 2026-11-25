export function total(rows) {
  // No initial value, so an empty input throws instead of returning 0.
  return rows.map((row) => row.cents).reduce((sum, cents) => sum + cents);
}
