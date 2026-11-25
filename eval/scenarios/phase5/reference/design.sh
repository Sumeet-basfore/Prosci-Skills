#!/bin/sh
set -eu
mkdir -p docs/design
cat > docs/design/payment.md <<'MD'
# Payment screen — requirements

## Brief

- goal: a returning customer pays a failed invoice without re-entering card details
- user: on a phone, mid-task, has one card on file
- constraint: 320px width and a 44px minimum target
- reuse: existing tokens (`--space-2`, `--color-danger`) and the primary button
- states: empty, loading, error, success
- success check: keyboard-only payment completes and the error is announced

## States

| state | shown | user can | copy |
| --- | --- | --- | --- |
| empty | "Nothing to pay" plus the invoice list link | open invoices | "You have no invoices due." |
| loading | amount skeleton, action disabled | wait | "Checking the amount…" |
| error | reason above the action, input kept | retry | "We could not take the payment. Your card was not charged. Try again." |
| success | confirmation with the invoice reference | leave | "Paid. We emailed your receipt." |

## Typography

One sans for UI; amount at 24px/1.2, body 16px/1.5, label 14px/1.3. Tabular numerals on the amount.

## Colour

- text on surface: 4.5:1; the error uses `--color-danger` with an icon and text, never colour alone.
- focus ring: 2px at 3:1 against both the button and the page.

## Accessibility

- The action is a button with the accessible name "Pay invoice".
- Errors are announced with `role="alert"`; focus returns to the action after a retry.
- Keyboard: Tab reaches the action, Enter activates, Esc does nothing destructive.
- Targets 44px minimum; text resizes to 200% without clipping.

## Responsive

- 320–599px: amount above the action, action full width, 44px tall.
- 600px and above: single column, 320px content width.

## Acceptance

- Keyboard-only payment completes; focus returns to the action after an error.
- Screen reader announces the error text when it appears.
- Copy strings above appear verbatim.
- At 320px the action is full width and at least 44px tall.

## Not inspected

No rendered surface was available, so visual and rendered-contrast checks are unverified; the contrast
values above are declared-token calculations, not measurements.
MD
