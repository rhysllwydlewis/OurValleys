# Split opening hours

A weekday can have a second opening window (a lunch break, an evening session). Delivered as an overhaul slice, 2026-10-23; the programme log in `docs/36-overhaul-programme-log.md` has the scope and the open items.

## Data

- `opening_hours_rule` gains nullable `second_opens_at` and `second_closes_at` (migration `0053`). Additive: the previously deployed app ignores the columns and keeps reading the first window.
- A check constraint requires both or neither, a day that is open with a first window, valid `HH:MM` times, and `closes_at < second_opens_at < second_closes_at`.
- The onboarding draft's `hours` JSON accepts the same optional fields (`secondOpensAt`, `secondClosesAt`). Drafts saved before this change read as "no second window". The shared schema (`onboarding-draft.ts`) is the single validator for the draft and the live editor.
- Special days stay a single window: they replace the whole day.

## Behaviour

- Owner editor (`/dashboard/business/[id]/operations#hours`): each day has "+ Add a second opening (after a break)", which reveals Reopens / Closes again. Errors point at `opens2-<day>` and `closes2-<day>`. The quick fills copy a Monday second window along with the first.
- Business website: the hours list and JSON-LD show every window (`09:00–12:00, 13:00–17:00`; one `OpeningHoursSpecification` per window).
- Live status: `openingStatus` returns `on-break` between windows ("Closed for a break · reopens today at 13:00"); `open` reports the closing time of the window the visitor is in. A second window that overlaps or precedes the first is ignored rather than guessed at.
- Directory: the "open now" filter and card status use the same two-window rule in SQL.

## Not in this slice

- The draft preview projection (`site-projection.ts`, a Sensitive path) still renders the first window only; a follow-up PR carries that one-line change for an owner decision.
- Split windows on special days, bank-holiday automation, more than two windows.
- Welsh strings are first-draft and need review by a fluent speaker.
