// Independent acceptance for the review unit. It checks that the review cites a real line of the
// implementation and is not a copy of the architecture artifact.
import { readFileSync } from "node:fs";

const [reviewPath, adrPath] = process.argv.slice(2);
if (!reviewPath || !adrPath) {
  console.error("usage: check-review.mjs <review> <adr>");
  process.exit(2);
}
const review = readFileSync(reviewPath, "utf8");
const adr = readFileSync(adrPath, "utf8");

if (review.trim() === adr.trim()) {
  console.error("review is a copy of the architecture artifact");
  process.exit(1);
}
const cite = review.match(/src\/stats\.mjs:(\d+)/);
if (!cite) {
  console.error("review cites no src/stats.mjs:<line>");
  process.exit(1);
}
const lines = readFileSync("src/stats.mjs", "utf8").split("\n");
const n = Number(cite[1]);
if (!Number.isInteger(n) || n < 1 || n > lines.length || !lines[n - 1].trim()) {
  console.error(`cited line ${n} does not exist in src/stats.mjs`);
  process.exit(1);
}
if (!/\b(pass|block)\b/i.test(review)) {
  console.error("review has no pass or block verdict");
  process.exit(1);
}
console.log(`review cites src/stats.mjs:${n} and is not a copy of the ADR`);
