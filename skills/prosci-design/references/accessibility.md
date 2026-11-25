# Accessibility

Accessibility requirements are checks, not values. This file is the set a design must specify before
implementation, and the set a reviewer can verify without a browser where possible.

## 1. Keyboard

- Every interactive element is reachable by Tab, in an order that matches the visual reading order.
- Nothing traps focus except a modal, and a modal always has an escape: Esc, plus a visible close.
- Custom controls (comboboxes, tabs, grids) declare their key map. "Arrow keys work" is not a spec; list
  which keys do what, and what Home/End do.
- Skip link to main content on every page with navigation above it.

## 2. Focus

- Visible on every focusable element, 3:1 against both neighbours, never `outline: none` without a
  replacement of equal or better visibility.
- Focus moves on route change to the new page's heading or main region; not to the top of the DOM.
- Roving tabindex for composite widgets (one stop in the Tab order, arrows inside).

## 3. Names and roles

- Every control has an accessible name: visible label preferred, `aria-label` only when the visible text is
  absent, `aria-labelledby` when it exists elsewhere.
- Icon-only buttons need a name; an SVG needs `aria-hidden` when decorative and a title/role when it is the
  control.
- Landmarks: one `main`, `nav` labelled when there is more than one, headings in order with one `h1`.
- Tables: `<th scope>`, caption where useful; never a div grid for tabular data.

## 4. Announcements

- Errors: `role="alert"` on the message, or `aria-live="assertive"` on the region that receives it.
- Status changes (saved, sent, count updated): `aria-live="polite"`.
- Do not put a live region around content that changes on every keystroke.
- Loading: announce start and end, not every frame.

## 5. Visual

- Text 4.5:1; large text 3:1; focus and meaningful non-text 3:1.
- Do not encode meaning in colour alone; pair with icon, text, or pattern.
- Text resizes to 200% without loss of content or function; layout reflows rather than clipping.
- Motion: honour `prefers-reduced-motion` for anything that moves more than ~5px or loops.
- Target size: 44×44 CSS px for touch surfaces, 24×24 minimum for pointer-dense tools.

## 6. Forms

- Label is programmatically associated; placeholder is not a label.
- Required/optional stated in text, not only with an asterisk.
- Errors: inline, specific, and announced; summary at the top for long forms, linking to fields.
- Autocomplete tokens (`autocomplete="email"`) on identity and payment fields.

## 7. What source checks can and cannot prove

Can be checked from source and tokens: labels, roles, heading order, `aria-*` wiring, focus style presence,
contrast from declared colours, target sizes from CSS, reduced-motion queries.

Cannot be checked without rendering: actual computed contrast after blending/opacity, focus visibility over
images, reflow at 200% and 320px, screen-reader output, keyboard order in a real DOM. Those require a
rendered surface or a human; say which is missing.

## 8. Checklist

- [ ] Keyboard path listed per flow, including escape
- [ ] Focus destination per transition
- [ ] Accessible name for every control
- [ ] Live regions named per message
- [ ] Contrast targets stated per role, computed where tokens allow
- [ ] 200% text and 320px reflow stated
- [ ] Reduced motion behaviour stated
