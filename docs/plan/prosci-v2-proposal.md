# Prosci v2 — proposal (amended, Phase A authorized)

**Status:** Phase A authorized for implementation. Phases B–D are directions, not work.
**Baseline:** seventeen skills, unchanged identities; all reports, tags, criteria and preview conditions
preserved. This is a controlled exception to the freeze, limited to `prosci-design`, `prosci-ship`,
`prosci-verify` and the validation that keeps them honest.

---

## 1. Audit that this proposal is built on

| fact | number | consequence |
| --- | --- | --- |
| Skills | 17, single-file, 83–168 lines | no progressive loading today |
| Companion files in the local skill ecosystem | 2,455 skills, 22,823 files (`impeccable`: 61) | the pattern is normal, not proven for us |
| Mature design skills locally | 247 and 987 lines, single file | depth can live in a body; references are a choice, not a law |
| Subagent primitive in pi | none (`--fork`, `--session` only) | orchestration execution is harness-specific |
| Discoverable models | 11 models / 3 providers; 9 auth providers | discovery is a config read, not a probe |
| Cost reporting | `totalFromProvider: false` on the proxied path | dollar caps are estimates; token caps are enforceable |
| Model routing in the wild (pstack) | one rules file, role → model | configuration, not capability inference |

## 2. Decisions, including the ones that narrow the ask

1. **No reference cap.** Context is controlled by `load_when` triggers and selective reading, not by a
   count. 250 lines is a maintainability guideline; `prosci-design` exceeds it where the subject earns it.
2. **No dollar-based enforcement claimed.** Token and request caps are enforceable; money is an estimate
   with a named source. The plan reports which kind of cap is active.
3. **No dynamic model discovery.** Tiers come from an explicit, editable file; capability from measured
   evidence, never from a model's name.
4. **No adapters in Phase A.** Instruction-only decomposition is portable; execution is the harness's job.
5. **Depth follows genuine value, not a benchmark failure.** Domain knowledge that is correct and
   actionable goes in; nothing waits for a historical failure to justify itself.

## 3. Skill package format

```
skills/<name>/
  SKILL.md            procedure, decision rules, triggers, boundaries, mandatory rules, acceptance
  skill.json          manifest: triggers, non_triggers, references[{path, load_when}], budget hints
  references/*.md     knowledge, patterns, anti-patterns, examples, checklists
  workflows/*.md      optional multi-step recipes
  examples/*          optional worked examples
  templates/*         optional copyable artefacts
  scripts/*           optional deterministic helpers
```

**Why a manifest rather than richer frontmatter:** pi parses frontmatter generically and reads only
`name`, `description` and `disable-model-invocation`, so extra keys are ignored — safe, but unverified for
the other four harnesses. A separate `skill.json` keeps the public format to what every harness already
accepts, and keeps our metadata validatable without depending on someone else's parser.

**Mandatory rules stay in `SKILL.md`,** in the same file as the procedure: "never claim visual
verification without a rendered surface", "read the reference before choosing type", "report missing
capability rather than simulating it". A reference is knowledge at the point of need; it is not where
safety rules hide.

## 4. Phase A scope

| skill | change |
| --- | --- |
| `prosci-design` | rewritten: workflow from product understanding to critique; 7 references covering typography, colour, composition and spacing, states and interaction, accessibility, motion, research and critique; anti-generic principles framed as diagnosis, not prohibition |
| `prosci-ship` | deepened with spec, test design and production readiness; 3 references; existing sequence and boundaries preserved |
| `prosci-verify` | deepened with CLI, HTTP and browser procedures plus a missing-capability protocol; 3 references |

## 5. Validation added in Phase A

Deterministic, no model:

- every manifest reference exists, is path-safe, and is named in the procedure step that needs it;
- every `references/*.md` is declared in the manifest (no dead files);
- installation copies references and `--check` resolves them;
- the fingerprint covers every file in each skill directory, not only `SKILL.md`;
- existing skills with no manifest still pass (backward compatibility);
- scenario layers and the network audit stay green.

Measured separately, when paid runs are next authorized:

- **loading**: the run's tool calls include the reference when its trigger fires;
- **application**: the produced artifact meets task-specific checks the old skill version fails.

## 6. What Phase A does not do

Survey tool, swarm planner, agent roles, adapters, new skills, new runtimes. Those remain proposals in §7
of the earlier draft and need their own approval and their own evidence.
