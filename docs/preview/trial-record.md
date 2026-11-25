# Trial record

Copy this file to `docs/preview/records/NNN-<slug>.md` (or keep it locally if it contains anything
private) and fill it in while the task is fresh. One file per task.

```yaml
date: YYYY-MM-DD
project: <repo or project name>
task: <one line: what was needed and why>
source: <issue link | user report | own need>
skills_invoked:
  - <skill>: <how it was invoked — explicit /skill:name | repo instruction | manual>
outcome: <merged PR | commit on branch | rejected | abandoned>
artifact: <PR or commit URL, or "none">
verification:
  commands: <the commands run, one per line>
  evidence: <what they printed; paste the failing-then-passing lines>
human_corrections:
  - <what the human changed, asked for, or had to explain>
observed_failures:
  - <wrong route | invented command | claim without evidence | scope creep | ignored instruction | none>
tokens: <input+output if known, else "unknown">
cost_usd: <if known, else "unknown">
materially_helped: <yes | partly | no>
why: <one sentence, honest; "no" is a useful answer>
follow_up_defects: <only defects actually observed after merge, with dates; otherwise "none observed">
reviewer: <who reviewed the diff>
```

## Guidance, not more fields

- **Task** is one line. If it needs a paragraph, the task was not clear enough to measure.
- **Verification** is commands and their real output. "Tests passed" without the command is not evidence.
- **Human corrections** are the most valuable column: they show where the skill stopped being useful.
- **materially_helped: no** is expected sometimes. Record it; a preview where everything helped is a
  preview that was not measured.
- **follow_up_defects** stays empty unless you actually saw one. Do not predict reliability.
