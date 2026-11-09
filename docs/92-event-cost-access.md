# Event cost and access

Status: built on branch `claude/ourvalleys-overhaul-event-cost-access`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status.

## Problem

Cost and access are the first two questions before attending a local event, but events carried no structured answer (issue #629). Owners wrote "free" into the description or not at all, and `/events` could filter only by search, category, place and date.

## What was built

- **Data (migration `0070`, additive).** `business_event.is_free` (nullable boolean), `price_note` (text, 1-80 characters) and `step_free` (nullable boolean). Existing rows stay null. **Null means "not stated"**: nothing is shown, filtered on or sent to search engines on the strength of silence.
- **Owner studio.** The event form has Cost (not stated / free / there is a charge), Price details (hidden for free events and dropped server-side so a stale note never sits beside "Free") and Step-free access (not stated / yes / no), with hints, validation (`priceNoteLong`) and the live preview. Copying an event and "apply wording to the series" carry the fields.
- **Public.** `EventCostTags` (`src/components/events/event-cost-tags.tsx`) shows Free / the price note / Step-free access / Not step-free on agenda rows and the event page. The labels follow the page language; the price note is owner text and carries `lang="en-GB"`.
- **Filters.** `/events?free=1` and `/events?stepFree=1` ("Free events only", "Step-free events only") work in the list, week and month views, the day strip counts, the next-date jump, the calendar subscription and saved searches (the saved-search link, description and new-result count). They match only events whose organiser stated it; the page says so.
- **Search engines and calendars.** Event JSON-LD gains `isAccessibleForFree` only when free or paid was stated (no `offers`, because there is no machine-readable price). Calendar entries (`.ics`) and Atom feed summaries gain an English "Cost and access" line only when something was stated.

## Out of scope

- A Welsh price note (the note is a short owner-typed string and is tagged as English; a Welsh variant would extend `event_translation`).
- Machine-readable prices and ticketing.
- Authorisation logic, the reserved public projection, `/cy` URLs.

## Tests

Unit: form parsing and round trips, tag logic, filter URL state, JSON-LD, `.ics`, saved searches. Integration (real Postgres): stored states and silence staying null, edit, copy, cross-business refusal, the 80-character database check, and filters never matching silence. Playwright: `tests/e2e/events-cost-access.spec.ts` (tags, filters, removal, Welsh labels, axe and overflow at desktop, tablet and mobile) and the studio journey in `account-events-studio.spec.ts`.

## Rollback

The migration only adds nullable columns and a check, so reverting the code leaves them unused and harmless.
