# Colour

Colour is a system, not a palette. The system is: semantic roles, a scale per role, and the contrast each
role must meet. Hex values are the last step.

## 1. Roles before values

| role | used for | must survive |
| --- | --- | --- |
| surface | page, card, sheet | both themes, and a blurred backdrop |
| surface-raised | popover, modal, sticky header | overlap on any surface |
| text-primary | body, headings | 4.5:1 on every surface it lands on |
| text-secondary | labels, metadata | 4.5:1; not below 4.5 for text under 18px |
| text-disabled | disabled controls | exempt from contrast, but distinct from secondary |
| border | dividers, input outlines | 3:1 where it is the only affordance |
| accent | primary action, selection | 3:1 against surface for non-text; 4.5:1 if it carries text |
| accent-hover / active | state of accent | visibly different, not a different hue family |
| success / warning / danger / info | status | distinguishable in greyscale, and each with an icon or word |

A brand colour is not automatically a state colour. If the brand is red, danger needs another signal.

## 2. Contrast, computed not eyeballed

- Text: 4.5:1 (WCAG AA). Text under 18.66px bold / 24px regular qualifies for 3:1 only in large-text cases.
- Non-text that carries meaning (icons, input borders, focus rings): 3:1 against its neighbour.
- Focus indicator: 3:1 against *both* the component and the page behind it. A ring that disappears on a
  dark card is not a focus ring.
- Check the worst pair, not the average: text on `surface-raised` over a scrim, secondary text on a tinted
  row, disabled text on a hover state.

## 3. Building the scale

For each role, define 3–5 steps, not 10. Name them by purpose (`surface-sunken`, `danger-strong`), never by
number alone (`gray-700`), because the number is a fact about the palette and the name is a fact about use.

Derive dark mode by role, not by inversion: surfaces get *lighter* as they elevate, text stays near-white at
reduced contrast, accents desaturate slightly to avoid glare, borders gain alpha rather than lightness.

## 4. Colour and perceived depth

Elevation in flat design is carried by surface steps and shadow, not by hue. Three surface levels are
enough for almost every product; the fourth is usually a sign the layout needs simplification.

## 5. Colour and state

- Hover: 4–8% lightness shift, or a border, not a new colour.
- Selected: a tinted surface plus a persistent marker (bar, bold text, check) — colour alone fails for
  colour-blind users and in high-contrast mode.
- Error: colour + icon + text. Never colour alone, never a red border with no message.
- Success: colour + confirmation text; a green dot with no words tells nobody what happened.

## 6. Brand colour in a product

Two uses are legitimate and one is not:

1. **Legitimate:** accent for the primary action, selection, and a small number of identity moments.
2. **Legitimate:** a tinted surface for brand-forward surfaces (marketing, onboarding) with text contrast
   preserved.
3. **Not legitimate:** a brand hue behind every primary surface, which forces white text to fail contrast
   and makes every screen shout.

When the brand colour cannot carry white text at 4.5:1, use it as a border, icon or underline and keep the
filled button in a darker step of the same hue.

## 7. Gradients, tints, and the slop diagnosis

Gradients are not the problem; gradients used as the only idea are. Ask: does this gradient encode
something (depth, progress, brand warmth), or is it a purple-to-pink rectangle behind a headline because
the layout had no other idea?

The same test applies to glassmorphism, heavy shadows, and neon accents: name what it communicates in this
product. If the answer is "it looks modern", it communicates nothing.

## 8. Checklist

- [ ] Roles named and mapped to values, per theme
- [ ] Worst-case contrast pairs computed, not sampled
- [ ] Focus ring contrast checked on both neighbours
- [ ] States distinguishable without colour (icon, text, weight)
- [ ] Dark mode derived by role, not inversion
- [ ] No more than 3 surface levels
