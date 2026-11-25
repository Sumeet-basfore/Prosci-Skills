# Typography

Type carries more of a product's character than any other single decision, and it is the cheapest to get
wrong. This file is a decision guide, not a font list.

## 1. Choose by job, not by taste

| job | what the type must do | what to look for |
| --- | --- | --- |
| body text in a dense tool | stay legible at 13–15px for hours | large x-height, open apertures, low stroke contrast |
| marketing headline | carry identity at 40–120px | distinctive silhouette, tight spacing at display sizes |
| data tables | align digits, survive 11px | tabular figures, unambiguous 1/l/I, 0/O |
| long-form reading | hold attention for 10+ minutes | moderate contrast, generous lead, true italics |
| UI labels and controls | not compete with content | neutral, medium weight, one step above body |

Pick **one** family for the product unless a display face genuinely carries the brand. Two competing
sans-serifs read as an accident, not a system.

## 2. Scale

Use a ratio, declared once:

- dense tool UI: 1.125–1.2 (12, 14, 16, 20, 24)
- content product: 1.25 (14, 16, 20, 25, 31)
- marketing surface: 1.333–1.5 at display sizes only

Rules that survive review:

- Body is 16px on the web unless the product is a dense console; 14px is a tool decision, not a default.
- A heading more than one step above its body needs its own spacing change, or the eye reads a gap.
- Never more than four sizes in one view. If a fifth is needed, the hierarchy is doing too much.
- Line height: body 1.5–1.65, UI labels 1.2–1.3, display 0.95–1.1 with negative tracking.
- Measure: 45–75 characters per line; below 35 the eye jumps, above 90 it loses the line.

## 3. Alignment and rhythm

- Left-align body text. Centred paragraphs beyond two lines are hard to scan; centred *single lines*
  (empty states, confirmations, marketing hero) are fine and often right.
- Right-align numbers in tables; left-align text; never centre a column of data.
- Baseline rhythm matters more than vertical margins: pick a 4px base and keep line boxes on multiples.

## 4. Numerals and text features

- Tabular figures (`font-variant-numeric: tabular-nums`) for any column, timer, or price.
- Old-style figures only in prose where the brand asks for it.
- Avoid all-caps for anything longer than a label; if used, add 0.02–0.08em tracking and reduce weight.
- Never use letter-spacing to fix legibility; it hides a font choice that is wrong for the size.

## 5. Type and identity

Ask three questions before choosing a face for a brand:

1. What does the product want to feel like — precise, warm, editorial, industrial, playful?
2. Does the chosen face express that in its *shapes* (a geometric grotesk is not warm; a humanist sans is
   not precise)?
3. Does it hold at the smallest size the product uses?

If the answer to (3) is no, the face is a marketing asset, not a product decision.

## 6. Failures that read as machine-made

- One font, one size, one weight for everything, with `font-weight: 600` doing all the hierarchy work.
- A random Google font chosen because its name sounded modern.
- Display face used at body size, or body face stretched to a 72px hero.
- 12px everywhere because the mockup was dense, with no optical correction.
- Gradient-filled display text as the only brand gesture.

## 7. Checklist before handoff

- [ ] Family count and why each exists
- [ ] Scale declared, with the ratio and the smallest size
- [ ] Line heights per role, and measure for body text
- [ ] Tabular numerals wherever numbers align
- [ ] Fallback stack per family, with a metric-compatible fallback if available
- [ ] Loading strategy: subset, `font-display`, and what happens before the font arrives
