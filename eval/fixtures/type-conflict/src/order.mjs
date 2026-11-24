import { makeId } from "./id.mjs";

export function orderTotal(id, cents) {
  return makeId(id) + cents;
}
