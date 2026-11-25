import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the screen declares a primary action", () => {
  assert.match(readFileSync("src/screen.html", "utf8"), /<button/);
});
