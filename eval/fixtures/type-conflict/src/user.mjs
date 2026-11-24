import { makeId } from "./id.mjs";

export function userKey(n) {
  return `user-${String(makeId(n)).padStart(4, "0")}`;
}
