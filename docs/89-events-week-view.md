# Events calendar: week view, next-date jump and period calendar feeds

Slice 2 of the events calendar (slice 1 is `docs/61-events-calendar.md`).

## What it does

- `/events?view=week&week=YYYY-MM-DD` shows one London week (Monday to Sunday) as seven day cards, including quiet days, with previous / next / this-week links. Any real day inside the week is accepted and normalised to its Monday; an invalid value falls back to the current week. The previous-week link stops at the current week because finished events are not public.
- The List / Week / Month switch keeps the visitor's search, category and place.
- An empty week or month offers **"Next events: <day>"**, a plain link into the week or month holding the next listed event, or a kind note when nothing later is listed. `findNextEventDay` only ever looks forward from the later of the period end and now, under the same filters.
- Calendar subscriptions follow the view: `/api/events/feed.ics?month=YYYY-MM` and `?week=YYYY-MM-DD` return that period only (same filters as the page). A malformed value is ignored and the plain upcoming feed is returned; a period overrides `when`.

## Rules reused from the month view

Multi-day events appear on every day they run; days before today are never listed; an end exactly at midnight does not spill into the next day; at most 300 events are read per period and the page says when it was truncated.

## Data and permissions

Read-only on existing public event data (same published/active/non-cancelled filters as every other public events query). No migration, no authorisation or projection change. Query parameters are parsed to real dates before use and never interpolated.

## Left for later

A month grid on place pages, Welsh review by a fluent speaker, per-event insight numbers.
