# Composition, spacing and density

Layout is the argument the page makes about what matters. Hierarchy is not decoration; it is the order in
which a person can perceive things.

## 1. One primary thing per view

Every view has exactly one primary action and one primary piece of information. Everything else is
secondary, and the layout must show that without a legend. If two things are equally prominent, neither is
prominent.

Test: squint at the screen. The first thing the eye lands on should be the thing the user came for.

## 2. Spacing system

- One base unit (4px or 8px). Every margin and padding is a multiple, with a small set of steps
  (4, 8, 12, 16, 24, 32, 48, 64).
- Proximity encodes grouping: the gap inside a group is smaller than the gap between groups, always. When
  in doubt, increase the space *between* groups rather than shrinking text.
- Vertical rhythm beats per-component margins: one owner for spacing (the layout container), not every
  child adding `margin-bottom`.
- Optical adjustments are legitimate: a circle next to text needs less padding than a square, and a
  headline with a descender needs less space below it.

## 3. Grid and alignment

- Columns for content, not for everything. A settings form is one column at 640px; a dashboard is a grid.
- Align to a small number of edges. Three or more competing left edges in one view reads as unfinished.
- Break the grid deliberately and once: a full-bleed image or an oversized number is a gesture; six of them
  is noise.

## 4. Density

Density follows the task:

| product | row height | body | spacing | why |
| --- | --- | --- | --- | --- |
| console / ops tool | 28–32px | 12–13px | tight, 4–8px | scanning many rows beats reading one |
| admin / CRM | 36–44px | 14px | 8–16px | mix of scanning and editing |
| consumer app | 48–56px | 15–16px | 16–24px | touch targets and calm |
| marketing | 64px+ | 17–18px | 32–96px | pacing and emphasis |

Density is not a style; it is a claim about how the product is used. A consumer app with console density
tells the user their time does not matter.

## 5. Hierarchy without weight inflation

Order of tools, strongest first:

1. **Space** — isolation makes a thing important.
2. **Size** — one clear step, not five small ones.
3. **Weight** — 400 vs 600 is enough; 400 vs 700 everywhere flattens.
4. **Colour/contrast** — secondary text at 70% opacity, not a different hue.
5. **Decoration** — borders, background, shadows. Last, not first.

If a layout needs a coloured card, a border, a shadow and bold text to show one thing is important, the
space is wrong.

## 6. Composition patterns that earn their place

- **List + detail** for browsing with a clear selection; two panes only above 1024px.
- **Single column with a sticky action** for linear flows (checkout, onboarding).
- **Bento** only when tiles represent genuinely different kinds of content; equal-size tile grids of text
  are filler.
- **Split hero** when the product is visual; a left-text/right-screenshot hero for the tenth time is a
  default, not a decision.

## 7. Composition failures that read as generated

- Everything centred, every section the same height, every card the same size.
- Three feature cards in a row with an icon, a heading and two lines of copy — because that is the shape
  the template had.
- A 12-column grid used to place two elements.
- Identical padding everywhere, so nothing groups.
- A hero with no product in it: abstract blobs, a gradient, and a claim.

## 8. Checklist

- [ ] Primary action and primary information named
- [ ] Spacing on one scale, grouping encoded by proximity
- [ ] Density chosen from the task table, justified in the brief
- [ ] Hierarchy achieved with space and size before decoration
- [ ] Edges aligned; at most one deliberate break
