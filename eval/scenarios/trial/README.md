# Real-repository trial

The three scenarios here were run once against this repository (`p4-trial-r3`, 6 runs, $0.0109) before
the release work they describe was implemented. They are archived because the repository now contains
`docs/supported-harnesses.md`, `docs/alpha.md` and `bin/install-skills --version`, so the acceptance
would pass untouched and measure nothing.

To re-run: revert those three artefacts on a branch, run
`node eval/harness/behaviour.mjs --layer trial --condition agentsmd --instruction direct --configs current,frozen9 --repeats 1`.

Kept because the run is evidence: both configurations passed the same one of three tasks, and the
scenarios document what a real task looked like.
