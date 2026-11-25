# Design research and critique

Research turns "make it nicer" into a decision with a source. Critique turns a draft into a set of specific
changes. Both are short procedures, not workshops.

## 1. Research on a budget

Before proposing a direction, spend fifteen minutes on four questions:

1. **Who is the user and what are they doing when they meet this screen?** If the answer is "everyone",
   the design will fit nobody.
2. **What do comparable products do, and why?** Look at two direct competitors and one product from an
   adjacent category that solves the same *shape* of problem. Name what you would copy and what you would
   reject, with a reason.
3. **What does this product already do?** Existing screens, tokens, copy tone. A design that ignores them is
   a redesign nobody asked for.
4. **What is the constraint that decides the design?** Data density, offline use, one-handed use, a
   regulated disclosure, a 3G connection. One constraint should be visible in the result.

Write the answers in the design brief, not in chat. A brief with no sources is a mood.

## 2. The brief

Six lines, before any layout:

```
goal: what the user can now do
user: who, in what state, on what device
constraint: the one thing that decides the shape
reuse: which existing components/tokens/patterns
states: which of the mandatory states apply
success: the observable check that this worked
```

If the brief cannot name a constraint, the design is decorative. If it cannot name a success check, it is
unfalsifiable.

## 3. Critique, in a fixed order

Critique the draft in this order and stop at the first level that fails, because later fixes do not repair
earlier problems:

1. **Task**: can the user do the thing? Is the primary action obvious and reachable?
2. **States**: are empty, loading, error, success defined? Does the copy tell the truth?
3. **Hierarchy**: squint test — does the eye land on the right thing first?
4. **Rhythm**: spacing scale, alignment edges, density consistency.
5. **Colour and type**: contrast, semantic use, scale, measure.
6. **Craft**: focus rings, hover states, motion timing, alignment of small things.
7. **Identity**: does it look like *this* product, or like a component library with the logo swapped?

Each critique note is one line: what is wrong, where, and the specific change. "Feels cluttered" is not a
note. "Three competing left edges in the filter row; align to the table's first column" is.

## 4. The anti-generic test

Put the draft next to a competitor's generic screen. Ask:

- Could this screen belong to another product in a different category with only a logo change? If yes, the
  identity is missing, not the polish.
- Is there one deliberate decision (a type choice, a density choice, a colour role, a layout break) that a
  designer could defend in a review? If not, the design has no point of view.
- Does any element exist because a template had it? Remove it and see if anything is lost.

Removing is the cheapest identity work available.

## 5. Handoff

The requirements a developer needs, and nothing else:

- state table with copy,
- hierarchy notes with the sizes/spacing tokens used,
- accessibility requirements per control,
- responsive rules per breakpoint,
- what was *not* inspected, and what a reviewer must therefore check on a rendered surface.

## 6. Checklist

- [ ] Brief has goal, user, constraint, reuse, states, success check
- [ ] Two comparables named with what to take and reject
- [ ] Critique followed the fixed order, one line per finding
- [ ] At least one deliberate decision a reviewer could defend
- [ ] Handoff names what is unverified
