# What's on: the events agenda (`/events`)

Status: shipped with the events overhaul (see `docs/36-overhaul-programme-log.md`). Extends the events work in `docs/24`; no ranking, permission, projection or schema rules changed.

## What changed for visitors

- **Compact header.** The page opens with a short heading and the search bar instead of a hero that filled the first screen on a phone.
- **Agenda by day.** Results are grouped under day headings: Today, Tomorrow, then full dates (the year is added only when it differs from this year). Each heading says how many events fall on it. An event that started earlier and is still running (a two-day fair) is shown under today, or under the chosen day, so it never vanishes after its first day.
- **Event rows.** Start time (London time, 24-hour) with "until HH:MM" or a short end date, the picture where the owner added one, a "Happening now" tag (words, not colour alone), the business and venue, a two-line description, and a separate **Add to calendar** link per event that uses the existing `.ics` download. The title is the real link and the whole row is clickable.
- **Day strip.** Fourteen days from today, each with its event count under the visitor's search, category and place. Days with events link to `?day=YYYY-MM-DD`; selecting the chosen day again clears it; empty days are dashed, non-interactive text. The strip scrolls sideways inside itself on narrow screens, never the page, and is hidden when nothing falls in the fortnight.
- **Quick ranges** gained "Next 30 days". Choosing a day or a range clears the other.
- **Numbered paging** that keeps every filter (the previous Next and Previous links dropped the quick range). A range line ("Showing 1–24 of 37") and the calendar subscription link sit beside the count; the feed keeps search, category, place and range but not a picked day.
- **A day with nothing** says so and points at the other days and the 30-day range rather than showing a bare empty page.
- English and Welsh (`src/lib/i18n/messages/events.ts`). Owner-typed text (title, venue, description, business) is data and carries `lang="en-GB"`.

## Code map

| Concern                                                   | File                                  |
| --------------------------------------------------------- | ------------------------------------- |
| URL state: parse, links, feed query, resetting paging     | `src/modules/events/event-filters.ts` |
| Day keys, day windows, day validation (Europe/London)     | `src/modules/events/date-window.ts`   |
| Grouping, "happening now", per-day counts                 | `src/modules/events/agenda.ts`        |
| Times and day headings                                    | `src/modules/events/format.ts`        |
| Query: `day` filter, shared `WHERE`, `listEventDayCounts` | `src/modules/events/public.ts`        |
| Strip, row, paging                                        | `src/components/events/`              |

## Data and privacy

No migration and no new stored data. Only fields the events list already exposed are read; the same lifecycle rules apply (published business, active event, not finished). The strip's query adds the same filters and is bounded to 500 rows over fourteen days. A picked day is validated as a real calendar day (`2026-02-31` is ignored) before it reaches the query.

## Not included

Saved reminders for residents, recurrence changes, a month-grid calendar, and the event detail page.
