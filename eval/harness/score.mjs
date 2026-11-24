// Scoring rules for one L3 run. Kept in one place so the report and the runner cannot disagree.

export const NEUTRAL_CHECKS = ["ran-verification", "no-weakening", "acceptance", "scope"];
export const PROSCI_CHECKS = ["route-named"];

export function rollup(runs) {
  const byKey = {};
  for (const run of runs) {
    const key = `${run.scenario}/${run.config}`;
    byKey[key] ??= [];
    byKey[key].push(run);
  }
  return Object.entries(byKey)
    .map(([key, group]) => {
      const [scenario, config] = key.split("/");
      const neutral = group.map((r) => r.neutralScore);
      const mean = neutral.reduce((a, b) => a + b, 0) / neutral.length;
      return {
        scenario,
        config,
        n: group.length,
        mean: Number(mean.toFixed(2)),
        min: Math.min(...neutral),
        max: Math.max(...neutral),
        perpendicular: null,
        checks: group.map((r) => r.checks),
      };
    })
    .sort((a, b) => a.scenario.localeCompare(b.scenario) || a.config.localeCompare(b.config));
}

// Only the checks that were actually evaluable count. A check that could not run is named in
// `excluded`, never counted as a pass, and never counted in the denominator.
export function scoreNeutral(checks) {
  const evaluated = NEUTRAL_CHECKS.filter((k) => checks[k] && checks[k].applies !== false);
  const passed = evaluated.filter((k) => checks[k].ok);
  return {
    neutralScore: evaluated.length ? Number(((passed.length / evaluated.length) * 4).toFixed(2)) : null,
    evaluated: evaluated.length,
    excluded: NEUTRAL_CHECKS.filter((k) => !evaluated.includes(k)),
  };
}
