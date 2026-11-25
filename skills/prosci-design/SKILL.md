---
name: prosci-design
description: "Decide the product surface: user flow, states, visual hierarchy, interaction, accessibility, responsive behaviour and copy, as implementation-ready requirements with verifiable acceptance. Use when a user-facing flow, screen, state or piece of product copy has to be defined or changed."
---

# Design

The failure this route prevents: a screen that works in the demo, has no empty state, no error a person
can act on, no keyboard path, and copy nobody wrote on purpose — all shipped because nobody owned the
surface.

Design owns the surface and hands over requirements a developer can build without guessing.

## Read before you start

This skill ships knowledge files next to it. Before step 3, open the ones this request needs with the `read`
tool. Resolve every path against **this skill's directory** — the folder containing this `SKILL.md`; when the
harness loaded the skill it told you that absolute location, and if you opened this file by path, use that
file's folder. Never assume the repo you are working in contains them.

| when the request involves | read |
| --- | --- |
| states, copy, errors, focus movement | `references/interaction-states.md` |
| keyboard, focus, names, live regions, targets | `references/accessibility.md` |
| type, scale, measure, numerals | `references/typography.md` |
| palette, contrast, semantic colour roles | `references/color.md` |
| layout, density, spacing, hierarchy | `references/composition.md` |
| identity, carriers, generic-looking output | `references/visual-identity.md` |
| motion, transitions, reduced motion | `references/motion.md` |
| the brief, research, critique order | `references/research-and-critique.md` |

Read at least the two that cover the states and accessibility of this surface. If a file cannot be opened,
say so and continue; do not invent its contents.

## Essential knowledge (do not depend on a reference)

These rules apply even if no reference file is opened.

**Brief, six lines, before layout:** goal · user and context · the one constraint that decides the shape ·
what is reused · applicable states · the observable success check.

**States, all that apply, each with copy:**
empty (what this is for + the action that starts it) · loading (delayed >300ms, shaped like the content) ·
partial (what exists, what is still loading) · error (what happened, whether data was saved, what to do) ·
success (what happened, what next) · disabled (why, not just greyed).

**Accessibility, minimum:** every control has an accessible name; keyboard reaches everything in reading
order; focus is visible at 3:1 and moves to the logical target (first invalid field on error, opener on
modal close); errors are announced once via `role="alert"`; text meets 4.5:1; targets ≥44px on touch;
`prefers-reduced-motion` respected.

**Hierarchy order:** space → size → weight → colour → decoration. One primary action per view.

**Density follows the task:** console 28–32px rows, admin 36–44px, consumer 48–56px, marketing 64px+.

**Disclosure:** without a rendered surface, say what is unverified. Static checks and declared-token
contrast are not rendered checks.

References add depth — typography scales, colour derivation, critique order, motion timing — read them when
the task goes beyond the rules above.

## When this runs

- A new screen, flow, or user-visible state has to be defined.
- A flow gains a failure, empty, loading, partial or success state.
- Accessibility, responsive behaviour, visual identity or product copy is in scope.
- An existing surface is called confusing, unfinished, or "generic" and someone must decide what changes.

## When it does not

- **API contracts, event shapes, schemas, module boundaries.** `prosci-architect`.
- **Implementing the component, fixing the bug, shipping the change.** `prosci-ship` / `prosci-fix`.
- **Reviewing a finished diff.** `prosci-review`.
- **Proving an existing surface works by running it.** `prosci-verify`.
- **A preference with no user requirement behind it.** Name the requirement, or leave it.

## Inputs

- The user requirement and who the user is in this flow.
- The existing product: the screen, components, design tokens, copy tone. Inspect before proposing.
- Constraints: platform, input methods, performance budget, legal or accessibility obligations.

## The workflow

### 1. Understand what exists

Read the current screen, the component set, the tokens and the copy. Name what you will reuse. If there is
no system, derive the minimum from the surrounding product rather than inventing a new one — a parallel
system is a redesign nobody asked for.

For an unfamiliar surface, `prosci-understand` first: the conventions there are the raw material here.

### 2. Establish intent

Write the brief, six lines, before any layout: goal, user and context, the one constraint that decides the
shape, what is reused, which states apply, and the observable check that this worked.

Read `references/research-and-critique.md` for the four research questions and the brief format. A brief
without a constraint is decoration; without a success check it is unfalsifiable.

### 3. Explore directions

Two or three directions, each a sentence plus the carriers it chooses (type, density, colour role, shape
language, imagery, voice). Not three colour schemes of the same layout — three *arguments* about the
product. Read `references/visual-identity.md` before naming carriers.

Then pick one. A design that presents four options and no decision has done half the job.

### 4. Decide the specifics

In this order, because each constrains the next:

1. **Flow** — entry points, the decision the user makes, success, and the two most likely failures.
2. **States** — read `references/interaction-states.md`. Empty, loading, partial, error, success, disabled;
   each with copy and the allowed action. A state you cannot describe is a state the developer invents.
3. **Composition and density** — read `references/composition.md`. Which density the task implies, how many
   edges, where the primary action sits, what can be removed.
4. **Type** — read `references/typography.md`. Family by job, scale ratio, measure, numerals.
5. **Colour** — read `references/color.md`. Roles before values, worst-case contrast pairs, state colours
   that survive greyscale.
6. **Motion** — read `references/motion.md` only if movement carries meaning (state change, spatial
   continuity). Otherwise say "no motion beyond feedback" and stop.
7. **Accessibility** — read `references/accessibility.md`. Keyboard path, focus destinations, names, live
   regions, target size, reduced motion.

Do not skip to step 4. A palette chosen before the flow is a mood board.

### 5. Communicate it as requirements

A requirements document, not a description of a picture:

| state | shown | user can | copy |
| --- | --- | --- | --- |

Plus: the type scale and spacing tokens used, the colour roles with contrast values, the accessibility
requirements per control, the responsive rules per breakpoint, and the acceptance list — each item
runnable or observable.

### 6. Inspect the rendered surface — only if one exists

If a browser, screenshot or running app is available: load it, check the states, tab through the flow,
resize to 320px and 200% text, and look at the focus ring on the darkest and lightest surfaces. Record what
you saw.

### 7. Critique and refine

Read `references/research-and-critique.md` §3 and run the order: task, states, hierarchy, rhythm, colour and
type, craft, identity. One line per finding: what is wrong, where, and the specific change. Then apply the
fixes that are inside this route's scope.

### 8. Disclose what you could not verify

If nothing was rendered, say so explicitly and list what is therefore unverified: computed contrast after
blending, focus visibility over imagery, reflow at 320px and 200%, real keyboard order, screen-reader
output. **Never describe a source-only review as visual verification.** Static checks and declared-token
calculations are not rendered checks; name which you did.

## Hard rules

1. Version the surface, not the taste: every requirement traces to the brief or the product's existing
   system.
2. One primary action per view. If two compete, the flow is wrong, not the styling.
3. Every state has copy. Placeholders are not copy.
4. Accessibility is specified as checks, not values.
5. Gradients, centred layouts, rounded corners, and any particular colour are permitted. What is not
   permitted is using one as a default with no reason tied to this product.
6. Do not claim visual quality, contrast after blending, or real keyboard behaviour without a rendered
   surface or a named human review.
7. The design owns the surface, not the contract. If the requirement needs a data shape the API cannot
   express, stop and route to `prosci-architect`.

## Output

- the brief,
- the state table with copy,
- type and spacing decisions with tokens,
- colour roles with contrast,
- accessibility requirements as checks,
- responsive rules per breakpoint,
- the acceptance list,
- what is unverified, and why.

If the project keeps design decisions in files, write them to the project's existing location; otherwise
deliver them as the reply. A file is justified when another person or session will implement from it.

## Failure handling

- **No rendered surface.** Continue on source and requirements; label the visual result unverified. Say
  which claims a human must check.
- **The requirement contradicts current behaviour.** Name both and ask which wins; do not redesign silently.
- **The design system lacks a component.** Specify behaviour first; note the component gap as a separate
  decision. Do not fork the system.
- **The requirement is really an API or data question.** Route to `prosci-architect`.
- **The brief cannot name a constraint.** Stop and ask. A design without a constraint cannot be critiqued.

## Acceptance criteria

1. The brief names goal, user, constraint, reuse, states and a success check.
2. Every applicable state is named with its copy.
3. Accessibility specifies at least keyboard path, focus behaviour and accessible names; contrast and
   target size where they apply.
4. Responsive behaviour names breakpoints and what changes at each.
5. Every requirement has a check a developer or reviewer can run.
6. The existing product and tokens were inspected, and the reuse is named.
7. If nothing was rendered, the report says so, distinguishes static checks from rendered checks, and
   claims no visual verification.
