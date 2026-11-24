---
name: prosci-release
description: "Cut a release the factory way: preflight the branch and checks, pick the version from the changes, update the metadata and changelog, build and inspect the artifact, and publish only on explicit authorization. Use when shipping a version, a package, a tag, or a published artifact."
---

# Release

A release is the one change that cannot be quietly withdrawn. Anyone who installs it gets
whatever you published. So the bar is higher than for a merge, and the last step needs a person.

Do not run this route for a repo that has no version, no package, and no tag. There is nothing to
release, and the ceremony teaches the wrong habit.

## 1. Preflight

Refuse to continue if any of these is false, and say which one.

- Working tree clean, on the release branch, up to date with the remote.
- The default branch's checks are green at the commit you are releasing, not at an earlier one.
- The full verification runs from a clean checkout, not from your warm one.
- You know the install or upgrade path a user follows. If the docs do not state it, that is a
  `prosci-docs` change first.

## 2. Pick the version from the changes

Read the commits since the last tag. They decide the number, not your preference.

| the changes contain | the bump |
| --- | --- |
| a removed or renamed public thing, a changed default a user depends on | major |
| a new feature, a new flag, a new endpoint, a new option | minor |
| fixes, docs, refactors, dependency updates, performance | patch |

Two rules that catch most mistakes.

- A change to a default value is a breaking change even when the code is a one-line edit. Someone's
  build changes behaviour without touching their code.
- A pre-1.0 package still follows the table. `0.x` is not a licence to break silently.

Write the number and the reason in the pull request.

## 3. Update the metadata once

Find every place the version lives before editing any of them. Typically a manifest, a lockfile, a
second manifest in a monorepo, a constant in the code, and the docs. Change them in one commit so a
reviewer sees one version.

Search for the old number after the edit. A leftover hard-coded version is the defect this step
prevents.

## 4. Write the changelog from the commits

Group by what a user cares about, not by commit type. Added, changed, fixed, removed. One line per
user-visible change, in the user's words, with the issue or pull request number.

Omit internal work that changes nothing a user can observe, unless it changes performance or
behaviour in a way they would notice.

Do not invent a summary. If the commits do not tell you why something changed, read the pull
request.

## 5. Build and inspect the artifact

Build the way a user receives it, not the way you develop it. Then look inside.

- Does it contain the files it should, and nothing that should not ship, such as tests, fixtures,
  or a `.env`?
- Does the version inside the artifact match the tag you are about to create?
- Install it into an empty directory and run its documented entry point. This is the check that
  proves the release, not the test suite.

Paste the install output.

## 6. Publish only on authorization

Tagging, publishing, and deploying are irreversible. Stop here and get an explicit yes from the
operator for the specific version, naming what will become public.

When you have it:

- Tag the commit you verified, not a later one.
- Push the tag, publish the package, or start the deploy exactly as the docs describe.
- Record the artifact's digest or version string in the release notes.

## 7. Verify the published thing

Install from the published source, in a clean place, and run it. The registry, the CDN, or the
deploy target is where a release fails when the local build succeeded.

If it fails, say so immediately with the output, and prepare the rollback or yank. Do not publish a
second version to paper over the first.

## 8. Write down the rollback

One line in the release notes: how to go back, who to tell, and whether the artifact can be
unpublished. A release with no stated rollback is a decision nobody thought about.

## Reply

The version and why, the artifact you inspected, the commands and their output, the install check,
the rollback line, and what remains unverified.
