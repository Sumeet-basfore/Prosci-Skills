export function slug(input) {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}
