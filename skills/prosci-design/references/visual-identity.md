# Visual identity

Identity is the set of decisions that make a screen recognisably *this* product. It is not a logo, a
gradient, or a font pairing; it is a small number of choices held consistently.

## 1. Pick two or three carriers

Choose the carriers deliberately and write them down:

| carrier | what it says | example decisions |
| --- | --- | --- |
| type | precise, warm, editorial, industrial | one distinctive face at display sizes, a neutral body |
| density | tool or surface | 12px/28px rows vs 16px/56px rows |
| colour role | calm, branded, functional | one accent, near-neutral surfaces, no rainbow states |
| shape language | soft, structural, technical | 2px vs 12px radius; borders vs shadows |
| imagery | human, product, diagrammatic | real screenshots vs illustration vs photography |
| voice | plain, expert, playful | sentence case, no exclamation marks, verbs first |

Three carriers held everywhere beat six applied once.

## 2. Coherence without sameness

- Same radius scale, same border weight, same shadow recipe across components.
- Different densities are legitimate *per surface* (marketing vs app), not per screen.
- A new component is a new decision only if it introduces a new carrier; otherwise it should compose
  existing ones.

## 3. Avoiding the "AI default" look

The diagnosis list, with the product-specific alternative:

| default | why it reads generic | alternative |
| --- | --- | --- |
| purple/indigo gradient hero | the default of every generated landing page | a colour taken from the product's own subject; or no gradient, a typographic hero |
| three equal feature cards with emoji icons | template shape, no content hierarchy | a list ordered by importance, with real screenshots |
| everything centred, generous whitespace, one sentence per section | no argument, only pacing | an asymmetric layout with a dominant element |
| rounded 16px cards with soft shadows everywhere | a single shape language applied to all content | borders for structure, shadows only for elevation |
| hero without the product | a promise with evidence removed | show the actual interface, cropped and real |
| lorem-flavoured copy ("supercharge your workflow") | says nothing falsifiable | the specific verb the product performs |

None of these are forbidden. Each is a decision that has to be *earned* by the product: a gradient that
represents a real spectrum, three cards that are genuinely three parallel choices, a centred hero for a
single-purpose tool. The failure is using them as defaults.

## 4. Voice in the interface

- Buttons are verbs ("Pay invoice", "Save draft"); never "Submit", never "OK".
- Empty states are sentences, not labels.
- Errors say what happened and what to do; they do not apologise more than once.
- The product's name is not repeated in every heading.
- Sentence case for UI text unless the brand is explicitly editorial.

## 5. Identity in code

Tie carriers to tokens so they cannot drift:

```
--font-display, --font-body
--radius-sm|md|lg        (one scale, no ad-hoc values)
--surface-*, --text-*, --accent-*
--space-*                (one scale)
--duration-fast|base|slow
```

A component that hard-codes a hex, a radius or a duration is where identity starts to erode.

## 6. Checklist

- [ ] Two or three carriers named, with the decision for each
- [ ] Every generic pattern in the draft justified or replaced
- [ ] Copy uses the product's verbs, not template language
- [ ] Tokens cover type, space, radius, colour, motion
- [ ] A reviewer could say "this is ours" without the logo
