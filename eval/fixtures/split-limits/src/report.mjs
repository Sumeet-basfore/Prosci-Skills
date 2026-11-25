import { DEFAULT_LIMIT } from "./config.mjs";

export function withinLimit(n) {
  return n <= DEFAULT_LIMIT;
}
