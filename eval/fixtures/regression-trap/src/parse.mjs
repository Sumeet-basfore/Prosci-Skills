export function parse(line) {
  const [key, ...rest] = line.split("=");
  return { key: key.trim(), value: rest.join("=").trim() };
}
