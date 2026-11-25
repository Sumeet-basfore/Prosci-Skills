# Motion

Motion answers "what just changed and where did it come from". If it does not answer that, it is decoration
with a frame budget.

## 1. Durations that feel right

| change | duration | easing |
| --- | --- | --- |
| press / hover | 80–120ms | ease-out |
| small state toggle | 120–180ms | ease-out |
| popover, tooltip | 150–200ms | ease-out on enter, ease-in on exit |
| modal, sheet | 220–300ms | enter ease-out, exit ease-in, exits faster |
| page or route change | 200–350ms | shared-element or fade, never a slide across the whole view |
| list reorder | 200–250ms | ease-in-out, stagger ≤ 30ms per item |
| progress / indeterminate | 1–2s loop | linear |

Anything over 400ms in a tool the user touches hourly becomes an irritant by the second day.

## 2. What to animate

- Animate **position, scale, opacity**. Avoid animating width/height/top/left (layout thrash).
- Enter: slight scale (0.96→1) plus fade. Exit: fade, faster, no scale-up.
- Shared element transitions when a card opens into a detail view; identity is the value.
- Stagger only for lists of genuinely new content; never for data refreshing in place.

## 3. Reduced motion

`prefers-reduced-motion: reduce` means: remove movement, keep feedback. Concretely — cross-fades instead of
slides, instant layout changes, no parallax, no auto-playing loops, no scaling. Never means "no
confirmation": the pressed state must still be visible.

## 4. Motion and identity

A product's motion personality is a choice, expressed consistently:

- **Precise tool**: short durations, small distances, ease-out, almost no bounce.
- **Consumer app**: slightly longer, softer easing, occasional spring on direct manipulation.
- **Editorial/brand**: slow, large reveals, but only on surfaces where the user is not working.

Mixing these in one product is what makes an interface feel assembled from parts.

## 5. Failures that read as generated

- Every element fading up on scroll, identically, for a whole page.
- Spring bounce on settings toggles.
- A 600ms modal that the user opens fifty times a day.
- Animating content that arrives from the network, so loading and transition fight each other.
- Motion that ignores reduced-motion, or that "respects" it by removing all feedback.

## 6. Checklist

- [ ] Duration and easing declared per transition class
- [ ] Only compositor-friendly properties animated
- [ ] Reduced-motion behaviour specified, with feedback retained
- [ ] Exits faster than entrances
- [ ] No loop that runs while the user is working
