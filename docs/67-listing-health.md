# 67. Listing health

Implements the owner-facing part of `docs/32` WP-12 (lifecycle automation). Built by the overhaul routine on 2026-10-22. No migration.

## Problem

The lifecycle service (annual confirmation, pause and resume, temporary closure, automatic publication, deletion with a recovery window) was complete, but an owner only met it as a form near the bottom of the long operations page. One "Action" dropdown put pausing beside permanently closing and requesting deletion, nothing explained what each did, dates were raw date-time fields and no deadline was stated in plain words.

## What the Listing tab is

`/dashboard/business/[id]/listing`, a tab on every dashboard page. Open to every member; what it offers depends on the role.

- **Status hero.** One plain sentence for the current state: live, not public yet, paused, closed for now, permanently closed, deletion requested (`listing-health-model.ts`, `listingHeadline`).
- **What happens next.** Scheduled dates soonest first: confirmation due (calm, soon within 30 days, overdue), closure end, automatic publication (only for an unpublished draft, using the later postponed date), deletion date. Days are UK calendar days.
- **Still trading?** One button, for any state that can confirm.
- **Visibility.** Pause, resume, and a temporary closure picked as a calendar day ("until the end of that day", UK time, correct on clock-change days, at most a year ahead). A temporary closure keeps the page online with a closed notice and ends by itself.
- **Reminders and emails.** Reminder emails, weekly summary and automatic publication in one form. Only the switches that changed are written, because switching automatic publication on again restarts its 14-day countdown. Terms acceptance and postponing (at most 90 days) live here too.
- **Closing for good.** Owner only. Permanently closing and requesting deletion each need the business name typed back (case and spacing ignored) and say plainly that deletion has a 30-day recovery window; while deletion is pending the only action is cancelling it.

English and Welsh strings are in `src/lib/i18n/messages/listing.ts` (Welsh is first-draft and needs a fluent reviewer).

## Authorisation and privacy

No authorisation logic changed and no helper call was removed. The page checks `view`, then reads `manageLifecycle`, `publish` and the owner role only to decide what to offer. Every action re-checks on the server:

| Action                                      | Needs                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| confirm, pause, resume, temporary close     | `manageLifecycle`                                                                                                                    |
| permanent close, request or cancel deletion | `manageLifecycle` **and** the owner role, plus the typed name for the first two (checked in the service layer, not only in the form) |
| reminder switches, accept terms, postpone   | `publish`                                                                                                                            |

The public demonstration account can read the page but every action is refused. The page only reads the one business it authorised. `?outcome=` is looked up with `Object.hasOwn`, so inherited keys show nothing. The older lifecycle section on the operations page is untouched, so both write through the same service and cannot disagree.

## Tests

- Unit: `listing-health-model.test.ts` (headline, timeline ordering and urgency, available actions per role and state, closure dates across summer time and clock changes, name matching).
- Integration (real Postgres): `tests/integration/listing-health.test.ts` (confirm/pause/resume restoring the published status, manager refused permanent close and deletion even with the right name, outsider refused, name mismatch changes nothing, owner-only cancel, dated closure and its refusals, reminder diffing keeps the countdown).
- Playwright: `account-listing-health.spec.ts` (signed-out redirect; full owner journey with axe at desktop and 390px).

## Left for the next slice

Emailing owners when a date is close beyond the existing reminders, split opening-hours shifts, removing the older operations lifecycle section (reduces authorisation-helper calls, so it is a Sensitive-paths decision), a Welsh review.
