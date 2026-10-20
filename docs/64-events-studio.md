# Events studio

Route: `/dashboard/business/[businessId]/events` (tab "Events"; Welsh "Digwyddiadau"). Implements doc 32 WP-11 for events, following the offers studio (doc 63).

## Why

Events were edited in the long operations page: every date was a bare form, nothing said whether an event was upcoming, on now, cancelled or over, a repeating event could only be cancelled as a whole, a typed date was read in the server's time zone, and the owner could not see how the event would look.

## What it does

- **Lifecycle states** derived from the stored status and dates by the rule the public site uses (active, and not over: its end, or its start when it has no end): _on now_, _upcoming_, _draft_, _paused_ (status `hidden`), _cancelled_, _past_. Grouped with counts; upcoming by date, past most recent first (the latest 20 are shown, with a count of the rest).
- **Guidance** per event (today, a complete draft ready to publish, a draft whose date has passed, no picture, place, booking link or end time, thin description). Past and cancelled events get none.
- **Quick actions**, decided by the server against the locked row: publish, pause, resume, cancel (people who saved the event are emailed, as before), reopen a cancelled event as a draft, postpone by 1, 7 or 14 days (same UK wall-clock time across clock changes), make a copy (a draft on the next future week at the same time and length), and cancel all upcoming dates of a series.
- **Full editor** with per-field error codes, what was typed kept after a refusal, a live preview of the event card, optimistic concurrency (`expectedUpdatedAt`) and the existing picture controls. A new event can repeat weekly, fortnightly or monthly (2 to 26 dates, each its own event); an existing date can optionally copy its title, description, place and booking link to the series' other upcoming dates the owner still manages (never dates, status or picture).
- **UK time** for every typed date (repeated autumn hour resolves to the first, the skipped spring hour moves forward).
- **Limits.** 500 events per business, enforced under an advisory lock (a series counts all its dates).

## Boundaries

No migration, no change to the public projection or to authorisation logic. Opening the studio and every action require `businessPermissions.manageContent` plus `canUseBusinessOperationsTools` (the public demo is read-only). Everything is scoped by `businessId`; another business's event id returns `not_found`. Administrator takedowns (`removed`) are never listed, edited, acted on or removed by owners (`locked`), and are counted in a notice. A new event cannot be created cancelled; a start in the past is refused for new events and for events switched on, but an old event can still be tidied or cancelled. Audit entries: `business.event_saved`, `business.event_removed`, `business.event_series_cancelled` and the new `business.event_state_changed`.

`notifyCancelledEventSaves` is now exported from `content-features.ts` so the studio's cancel paths notify savers exactly as the old form does. The operations page keeps its events section (with a link to the studio).

## Known limits

- A copy shares the original's picture row, as with offers.
- A series is a set of separate dates: editing the dates of the others, or their pictures, is per date. Moving a whole series is not offered.
- The studio reads at most the first 600 events of a business by start date.
- The 500-event cap is enforced by the studio; the older operations form does not enforce it (the studio still lists what exists).
- A refused save rebuilds the form, so a chosen picture must be chosen again (the form says so).
- Welsh strings are first-draft and need review by a fluent speaker.

## Not in this slice

Reordering is not applicable (events sort by date). Left: per-event insight numbers, moving a whole series, Welsh event text inside the studio (it stays in the Welsh tab), removing the older operations form, a reminder before an event with no booking link.
