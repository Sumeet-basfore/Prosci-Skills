# Interaction states

A state is not a spinner. A state answers three questions: what is happening, what can I do, and what
happened to my input.

## 1. The mandatory set

| state | must show | must allow | copy skeleton |
| --- | --- | --- | --- |
| empty (first use) | what this is for, and the one action that starts it | start the thing | "No invoices yet. When a client pays, their invoice appears here." |
| empty (filtered) | what was filtered, how to clear it | clear the filter | "No results for 'october'. Clear the filter." |
| loading | the shape of the coming content | nothing; controls disabled or optimistic | "Loading invoices…" (only if >1s) |
| partial | what exists and what is still loading | act on what exists | "Showing 20 of 340. Loading more…" |
| error | what failed, whether data was saved, what to do | retry, and recover input | "We couldn't save this. Your changes are still in the form. Try again." |
| success | what happened, and what to do next | continue, or leave | "Invoice sent to sam@example.com." |
| disabled | why it cannot be used | nothing until the reason clears | "Add a client first." (a tooltip is not a reason) |

If a state is missing from the brief, the implementer will invent it, and usually as a blank screen.

## 2. Loading

- No spinner under 300ms; it reads as a flicker. Use a delayed indicator.
- Skeleton screens must match the final layout's shape, or they cause a jolt when content arrives.
- Optimistic updates need a visible failure path: the row comes back, with a reason.
- Never disable the entire page for one slow region. Scope the loading to what is actually loading.

## 3. Errors

The three sentences every error needs, in order:

1. **What happened** — "We couldn't take the payment."
2. **What it means for the user's data** — "Your card was not charged."
3. **What to do** — "Try again, or use another card."

Rules:

- Error text goes next to the thing that failed, not in a global banner, unless the whole page failed.
- Never blame the user ("invalid input"); state the constraint ("The date must be in the future").
- Preserve input on every failure. Losing a filled form is the most expensive bug in a flow.
- Field errors: message under the field, `aria-describedby` wired, and the field marked invalid.
- Announce to assistive tech once; do not re-announce on every keystroke.

## 4. Focus behaviour

| action | where focus goes |
| --- | --- |
| open modal | first meaningful control, or the dialog itself if it is a message |
| close modal | back to the element that opened it |
| submit with error | the first invalid field |
| delete a row | the next row, or the list's first item |
| success | the confirmation, or the next logical field — not the top of the page |
| async content appears | nowhere; do not steal focus. Announce instead. |

## 5. Feedback and timing

- Press: immediate visual response (within 100ms), even if the action takes longer.
- Under 1s: no spinner, just the result.
- 1–10s: progress with a label.
- Over 10s: progress plus an estimate, plus a way to leave and be notified.
- Destructive: confirm with the object's name ("Delete invoice 1042?"), not "Are you sure?".

## 6. Checklist

- [ ] Every state above defined, with copy, for each surface in the flow
- [ ] Focus destination named for every transition
- [ ] Input preservation on error
- [ ] Errors announced once, tied to fields
- [ ] Loading scoped, delayed, shaped
- [ ] Disabled controls explain themselves
