export function levelFor(count) {
  if (count > 100) return "error";
  if (count > 10) return "warn";
  return "info";
}
