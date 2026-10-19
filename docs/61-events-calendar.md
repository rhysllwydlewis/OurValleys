# Events calendar (month view)

Status: shipped by the overhaul routine (2026-10-19). See `docs/36-overhaul-programme-log.md`.

## What it is

`/events` has two views of the same published, active events:

- **List** (default): the agenda with the 14-day strip, as before.
- **Month** (`?view=month&month=YYYY-MM`): a Monday-first calendar grid. A day with events is a link showing a count and up to two titles; choosing it adds `&day=YYYY-MM-DD` and the list below narrows to that day ("Show the whole month" clears it). Without a chosen day the list below is the whole month. Previous/next month and "This month" links keep the search, category and place filters.

The month view is plain server-rendered HTML and links: it works without JavaScript, by keyboard, and in English and Welsh. The grid is a real `<table>` with weekday column headers; every cell has a full-sentence label ("Saturday 14 February 2099: 3 events") and titles in the cell are `aria-hidden` decoration, because the real event links are in the list below.

## Rules

- Same visibility as the rest of `/events`: published business, active event, not finished, primary active location. Finished events are not public, so days already past show nothing and the previous-month link stops at the current month (a past month is still reachable by URL and says why it is empty).
- An event runs on every London day it touches; one ending exactly at midnight does not spill onto the next day. Days use Europe/London, including around clock changes.
- A month is capped at 300 events; beyond that the page says so and asks the visitor to narrow the search.
- An invalid `month` falls back to the current month (or the chosen day's month); an invalid `view` is the list. A quick range (`when`) does not apply in the month view.
- The month view is `noindex` like the rest of `/events`; the calendar feed (`/api/events/feed.ics`) is unchanged and ignores the view.

## Code

- `src/modules/events/month.ts`: pure month maths (parse, shift, window, grid, per-day grouping).
- `src/modules/events/public.ts`: `listPublicEventsForMonth`.
- `src/modules/events/event-filters.ts`: `view` and `month` URL state.
- `src/components/events/month-calendar.tsx`, `month-section.tsx`, styles in `events.module.css`.
- Strings: `eventsCal.*` in `src/lib/i18n/messages/events.ts` (Welsh is first draft, needs fluent review).

## Not included

Week view, a per-day "add all to calendar", a month-scoped `.ics` feed, jumping to the next month that has events.
