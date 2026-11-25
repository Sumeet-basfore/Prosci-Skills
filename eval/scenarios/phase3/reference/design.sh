#!/bin/sh
set -eu
mkdir -p docs/design
cat > docs/design/payment.md <<'MD'
# Payment screen — requirements

Goal: a returning customer pays a failed invoice without re-entering card details.

## States

| state | shown | user can | copy |
| --- | --- | --- | --- |
| empty | "Nothing to pay" plus the invoice list link | open invoices | "You have no invoices due." |
| loading | amount skeleton, action disabled | wait | "Checking the amount…" |
| error | failure reason above the action, amount kept | retry | "We could not take the payment. Your card was not charged. Try again." |
| success | confirmation, invoice reference | leave | "Paid. We emailed your receipt." |

## Accessibility

- The action is a button with the accessible name "Pay invoice".
- Errors are announced with `role="alert"` and `aria-live="assertive"`.
- Keyboard: Tab reaches the action, Enter activates it, focus returns to the action after a retry.
- Focus is visible: a 2px outline at 3:1 contrast, never removed.
- Text meets 4.5:1 against its background.

## Responsive

- 320–599px: amount above the action, action full width, 44px minimum height.
- 600px and above: single column, 320px maximum content width.

## Acceptance

- Keyboard only: the payment completes and focus returns to the action after an error.
- Screen reader: the error text is announced when it appears.
- Copy: the primary action reads "Pay invoice"; each state shows the sentence above.
- Responsive: at 320px the action is full width and at least 44px tall.

## Not inspected

No rendered surface was available, so visual inspection was not performed; layout and contrast are
requirements here, not verified results.
MD
