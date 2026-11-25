---
name: prosci-merge
description: "Integrate changes that were developed separately — branches, agent worktrees, stacked pull requests, repos — and verify the combined state, because two branches that pass alone can break together. Use when more than one independent change has to land as one result."
---

# Merge

The failure this route prevents: two branches, both green, merged into a result nobody ran. Git resolves
the text and reports success; the semantic conflict — a constant one branch lowered, a batch size the
other raised — ships silently.

## When this runs

- Two or more branches, worktrees, or pull requests have to land together.
- A stacked pull request where the upper change assumes the lower one.
- Changes touch a shared contract from opposite sides: a constant, a schema, a flag default, a public
  type.
- Cross-repo integration: a client and a server that must agree on a shape.
- Independent agent work that has to be combined before review.

## When it does not

- **One branch, one change, rebased on main.** That is `prosci-ship`.
- **Reviewing a single diff.** `prosci-review`.
- **Publishing a version, tag, or package.** `prosci-release`.
- **Writing the feature or fixing the conflict by changing behaviour.** `prosci-ship` / `prosci-fix`;
  this route integrates, it does not author.
- **Deciding whether the work is done.** `prosci-bar`.

## Inputs

- The base commit or branch each change was cut from.
- Each change, and the command that proves it, run on its own branch.
- The intended combined behaviour, in one sentence per change.
- Who is allowed to publish, and to which remote.

## Procedure

1. **Inspect the base before touching anything.** Record `git rev-parse HEAD`, the current branch, and
   whether the tree is clean. An integration started on dirty state cannot be undone cleanly.

2. **Inspect each change alone.** For every branch: what it changes, what it assumes about the base, and
   its proof command with output. A branch whose own check is red is not integrated; it is fixed first.

3. **Order them.** Dependencies first: schema before the code that reads it, a shared type before its
   consumers, a base PR before the stacked one. Two changes that both edit the same constant have no
   safe order — that is a decision for a human, not a merge order.

4. **Merge one at a time, verifying after each.** `git merge --no-ff` (or rebase, if the project's
   convention says so), then run the combined checks before the next. A failure after merge N points at
   merge N; a failure after all of them points at nothing.

5. **Hunt semantic conflicts deliberately.** Text merged cleanly does not mean behaviour did. For every
   change, list what it assumed and check it still holds: a constant that moved, a default that flipped,
   a validation bound, an enum member added on one side and switched on the other. This is the step that
   text-level tools cannot do for you.

6. **Verify the combined state with a check that spans both changes.** Not "both suites pass" — those
   were written before the other change existed. Run the integration path: the batch through the new
   limit, the client against the new server shape, the stacked branch against the merged lower one.

7. **Record the recovery.** The merge commit, the commands to undo it (`git reset --hard <sha>` on a
   local, unpublished branch; `git revert -m 1 <sha>` on a published one), and what state that restores.
   Destructive git operations and pushes need explicit authorization before you run them.

8. **Preserve unrelated work.** Other branches, stashes, and uncommitted files stay untouched. If a
   merge requires discarding someone's work, stop and ask.

## Output

- The base commit and each change, with its individual proof.
- The order, and the reason for it.
- The semantic conflicts found, and how each was resolved.
- The combined-state check, with output.
- The recovery procedure.
- Anything merged with a known gap, named.

## Failure handling

- **The combined check fails.** Do not "fix" it by weakening the check. Decide which change's intent
  wins, state it, and make the other change conform — that is a small code change, in its own commit,
  with its own test.
- **A branch cannot be verified on its own.** Stop. Integration without individual proof produces a
  result nobody can attribute.
- **Two approved intentions genuinely conflict.** Two products want opposite behaviour: that is a
  decision, not a merge. Stop, name both intentions, and escalate.
- **An unresolved semantic conflict.** When you cannot show that the combined state is consistent, do not
  merge and do not publish. Present the state and require an explicit human approval before proceeding;
  silence is not approval.
- **A constraint meets a value.** One change sets the policy, the other sets a number that now violates
  it. That is not a decision for a human: the constraint stays and the value conforms. Resolve it in a
  small commit with a test, and say which side you treated as the constraint. Escalating this is
  unnecessary escalation standing in for engineering work.
- **The merge would touch published history.** Do not force-push. Report the situation and ask.
- **You cannot run the combined surface** (missing service, credential, dataset). Say so and merge
  nothing that claims verification; a merge with unverified combined state is a finding, not a pass.

## Acceptance criteria

1. The base commit and every input branch are named, with each one's own check and output.
2. The merge order is stated with a reason; ordering conflicts are escalated, not guessed.
3. At least one semantic conflict was looked for by name — a constant, default, bound, schema, or enum —
   and the result recorded, including "none found, checked these". A constraint violated by a value is
   resolved, not escalated.
4. A combined-state check exists that exercises both changes together, with its output.
5. The recovery command is written down and is safe for the branch's publication state.
6. No unrelated branch, stash, or file was modified; no force-push or reset without authorization.
7. Any unresolved semantic conflict is presented for explicit human approval, with the combined-state
   evidence, before a merge or publication happens.
