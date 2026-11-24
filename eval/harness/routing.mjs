#!/usr/bin/env node
// L1: structural evaluation of the router table. No model, no network, milliseconds.
//
// What it proves: every scenario is owned by exactly one row, every row is exercised, no forbidden
// row matches, and the keyword map has not drifted from the table.
// What it does not prove: that a model reads the table the way the map does. That is L3's question.

import { readJson, routerRows, loadScenarios, scenarioDir, humanPath } from "./lib.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const verbose = args.includes("--verbose");

const map = readJson(new URL("./keywords.json", import.meta.url).pathname);
const rows = routerRows();
const scenarios = loadScenarios(scenarioDir("routing"));

const fail = [];
const known = [];
const notes = [];

function hits(request, route) {
  const list = map.routes[route] ?? [];
  return list.filter((phrase) => request.toLowerCase().includes(phrase)).length;
}

function scoreRow(row, request) {
  // A row naming two routes only matches when the request evidences both. Without this rule, every
  // docs request collects points from the stacked row's behaviour half and the table looks ambiguous.
  if (row.routes.length > 1) {
    const perRoute = row.routes.map((route) => hits(request, route));
    if (perRoute.some((n) => n === 0)) return 0;
    return perRoute.reduce((a, b) => a + b, 0);
  }
  let score = 0;
  for (const route of row.routes) score += hits(request, route);
  const lower = request.toLowerCase();
  if (row.routes.includes(map.interrogative.route) && map.interrogative.markers.some((m) => lower.includes(m))) {
    score += map.interrogative.weight;
  }
  return score;
}

function bestRows(request) {
  const scored = rows.map((row) => ({ row, score: scoreRow(row, request) })).filter((r) => r.score > 0);
  if (!scored.length) return { best: [], tie: false };
  const top = Math.max(...scored.map((r) => r.score));
  const best = scored.filter((r) => r.score === top).map((r) => r.row);
  return { best, tie: best.length > 1 };
}

// Drift, both directions. A map entry with no row, or a row no scenario can reach, is a defect.
const rowRoutes = new Set(rows.flatMap((r) => r.routes));
const mapRoutes = new Set(Object.keys(map.routes));
for (const route of mapRoutes) if (!rowRoutes.has(route)) fail.push(`drift: keyword map names ${route}, router table does not`);
for (const route of rowRoutes) if (!mapRoutes.has(route)) fail.push(`drift: router table names ${route}, keyword map does not`);

const usedRows = new Set();
const results = [];

for (const scenario of scenarios) {
  const { best } = bestRows(scenario.request);
  const expect = scenario.expect ?? [];
  const forbidden = scenario.forbid ?? [];
  const problems = [];

  // Several rows can map to the same route (a feature and a large change both go to prosci-ship), so
  // ambiguity is judged by the set of routes the best rows name, not by row identity.
  const signatures = [...new Set(best.map((r) => [...r.routes].sort().join("+")))];
  const matchedRoutes = [...new Set(best.flatMap((r) => r.routes))];
  for (const row of best) usedRows.add(row.text);

  if (!best.length) problems.push("no row matched");
  if (signatures.length > 1) problems.push(`ambiguous rows: ${signatures.join(" vs ")}`);
  for (const route of expect) if (!matchedRoutes.includes(route)) problems.push(`expected ${route}, matched ${matchedRoutes.join("+") || "none"}`);
  for (const route of forbidden) if (matchedRoutes.includes(route)) problems.push(`forbidden ${route} matched`);

  const record = { id: scenario.id, request: scenario.request, expect, forbidden, matched: best.map((r) => r.routes), problems };
  results.push(record);

  if (problems.length) {
    if (scenario.known_failure) known.push({ ...record, defect: scenario.known_failure });
    else fail.push(`${scenario.id}: ${problems.join("; ")}`);
  } else if (scenario.known_failure) {
    fail.push(`${scenario.id}: marked known_failure ${scenario.known_failure} but it passed. Drop the marker`);
  }
}

// Dead rows: a row no scenario reaches is either untested or wrong.
for (const row of rows) {
  if (!usedRows.has(row.text)) notes.push(`dead row: "${row.text}" is exercised by no scenario`);
}

const negatives = scenarios.filter((s) => s.must_not_change_files).length;
const summary = {
  scenarios: scenarios.length,
  negatives,
  rows: rows.length,
  failures: fail.length,
  known: known.length,
  deadRows: notes.filter((n) => n.startsWith("dead row")).length,
};

if (json) {
  console.log(JSON.stringify({ summary, fail, known, notes, results }, null, 2));
} else {
  for (const r of results) {
    if (verbose || r.problems.length) {
      console.log(`${r.problems.length ? "FAIL" : "ok  "} ${r.id}  ->  ${r.matched.flat().join("+") || "-"}`);
      for (const p of r.problems) console.log(`     ${p}`);
    }
  }
  for (const k of known) console.log(`KNOWN ${k.id} (${k.defect}): ${k.problems.join("; ")}`);
  for (const n of notes) console.log(`NOTE  ${n}`);
  for (const f of fail) console.log(`FAIL  ${f}`);
  console.log(`\n${summary.scenarios} scenarios (${negatives} negative), ${summary.rows} rows, ${summary.failures} failures, ${summary.known} known`);
}

process.exit(fail.length ? 1 : 0);
