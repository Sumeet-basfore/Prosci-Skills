---
name: prosci-design
description: "Decide the product surface: user flow, states, visual hierarchy, interaction, accessibility, responsive behaviour and copy, as implementation-ready requirements with verifiable acceptance. Use when a user-facing flow, screen, state or piece of product copy has to be defined or changed."
---

# Design

The failure this route prevents: a screen that works in the demo and has no empty state, no error
message a person can act on, a button that cannot be reached by keyboard, and copy nobody wrote on
purpose — all shipped because nobody owned the product surface.

Design owns the surface and hands over requirements a developer can build without guessing.

## When this runs

- A new screen, flow, or user-visible state has to be defined.
- A flow gains a failure, empty, loading, partial or success state.
- Accessibility, responsive behaviour, or product copy is in scope.
- A product surface exists and a requirement says it is incomplete or confusing.

## When it does not

- **API contracts, event shapes, schemas, module boundaries.** `prosci-architect`.
- **Implementing the component, fixing the bug, shipping the change.** `prosci-ship` / `prosci-fix`.
- **Reviewing a finished diff.** `prosci-review`.
- **Proving an existing surface works by running it.** `prosci-verify`.
- **A purely aesthetic preference with no user requirement behind it.** Name the requirement or leave it.

## Inputs

- The user requirement and who the user is in this flow.
- The existing product: the screen, the components, the design system or tokens, and the conventions
  already in use. Inspect before proposing; a design that ignores the existing system is a redesign
  nobody asked for.
- Constraints: platform, input methods, performance budget, legal or accessibility obligations.

## Procedure

1. **Inspect what exists.** Read the current screen and the design system: spacing, type scale, colour
   roles, component variants, copy tone. Name what you are reusing. If there is no system, say so and
   derive the minimum from the surrounding product rather than inventing a new one.

2. **State the user goal in one sentence**, from the user's side: "a returning customer can pay a failed
   invoice without re-entering their card".

3. **Map the flow before the screen.** Entry points, the decision the user makes, what happens on
   success, and the two most likely ways it goes wrong. One screen is rarely the whole flow.

4. **Define every state, explicitly.** Empty (first use), loading (what is shown, for how long before
   something changes), partial, error (what failed, what the user can do, whether their input survives),
   success (what confirms it), and disabled or unavailable. A state you cannot describe is a state the
   developer will invent.

5. **Specify accessibility as requirements, not values.** Keyboard order and trap behaviour, focus
   visibility and where focus moves after an action, labels and accessible names for every control,
   error announcement to assistive technology, contrast requirement for text and non-text, touch target
   size, reduced-motion behaviour. These are testable; "should be accessible" is not.

6. **Specify responsive behaviour by breakpoint and by what changes**, not "make it responsive": what
   reflows, what truncates, what moves below the fold, what is hidden and why.

7. **Write the copy.** Every state gets its words: the label, the empty-state sentence, the error that
   says what to do next, the confirmation. Product copy is part of the requirement; leaving it as
   "lorem" hands the decision to whoever implements.

8. **Turn each requirement into an acceptance check** someone can run: a keyboard-only path, a state
   reached by a named input, a copy string that must appear, a focus target after an action.

9. **Disclose what you could not inspect.** If no browser, screenshot, or rendered surface is available,
   say plainly that the visual result was not inspected and which requirements are therefore unverified.
   Never describe a design as visually checked when you only read the source.

## Output

Requirements, not mood boards:

- the user goal and the flow, with entry points and failure paths,
- a state table: state, what is shown, what the user can do, the copy,
- accessibility requirements as checks,
- responsive behaviour per breakpoint,
- the acceptance list, each item runnable or observable,
- what was reused from the existing system, and what is new and why,
- explicitly: what was not visually inspected.

## Failure handling

- **No rendered surface is available.** Continue on source and requirements, and label the visual result
  unverified. Do not claim visual quality.
- **The requirement contradicts the product's current behaviour.** Say which, and ask which wins; do not
  silently redesign the flow.
- **The design system has no component for the need.** Specify the behaviour first; note the component
  gap as a separate decision. Do not invent a parallel system.
- **The requirement is really an API or data question.** Stop and route to `prosci-architect`; a UI
  decision cannot fix a contract that cannot represent the state.

## Acceptance criteria

1. Every state in the requirement is named: empty, loading, error, success, and any partial or disabled
   state that applies.
2. Each state has the copy the user will see, written out, not described.
3. Accessibility is specified as at least three checks: keyboard path, focus behaviour, and accessible
   names; contrast and touch targets where they apply.
4. Responsive behaviour names the breakpoints and what changes at each.
5. Every requirement has an acceptance check a developer or reviewer can run.
6. The existing product and design system were inspected first, and the reuse is named.
7. If no rendered surface was available, the report says so and does not claim visual verification.
