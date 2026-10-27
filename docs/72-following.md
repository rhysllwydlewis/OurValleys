# Following saved businesses

Status: built 2026-10-27 (overhaul programme, see `docs/36-overhaul-programme-log.md`).

Saving a business now means something. When a business a resident saved posts an update, adds an offer or plans an event, the resident gets an in-site notice and can see it on `/account/following`.

## What a resident sees

- **Notification centre** (`/account/notifications`): three new kinds, "{business} posted an update", "{business} has a new offer" and "{business} added an event". They sit in the "Saved and followed" group and open the update, the offers section of the business page, or the event.
- **`/account/following`** ("From your businesses"):
  - the latest updates, offers and events (last 45 days, at most 30) from saved businesses, newest first, each labelled by kind, with a link;
  - one switch per saved business to turn its notices off or on, and "turn all off / on".
  - Reached from the notifications page and the saved page.
- Notices never send email. The weekly place digest is unchanged and still mails new offers and events when its own opt-in is on.

## How it works

- `resident_saved_business.notify` (additive column, default `true`) is the per-business switch. Existing saved businesses keep notifying.
- `job_cursor` (new table) stores where the `followed-notices` job stopped. Each run (every 30 minutes) covers the time since the cursor, at most 24 hours back, and one hour on the first ever run so switching the job on does not announce old posts. The cursor advances only after every notice for the window was written; if a scan hits its row limit the cursor stops at the newest row read, so the rest is picked up next run.
- A notice is raised through `raiseNotification` with the dedupe key `follow:<kind>:<item id>`, so a retried or overlapping run, or a post that is unpublished and republished, never notifies twice. At most 12 notices per person per run.
- Who is notified: the saver is verified and not banned, the switch is on, and the business is published, not suspended and not a fictional demonstration business. Updates count when published, offers when active and currently valid, events when active and not yet over. A notice is raised when the item is created (offers and events) or published (updates): an offer or event created as a draft and published much later is not announced (the weekly digest has the same rule).
- `account_notification_kind_check` now allows the three new kinds. The migration (`0060`) is additive; the previous release never writes the new kinds, so rolling the code back leaves them harmlessly unused.
- `/account/following` reads only public, published content and only the signed-in person's own saved rows. Actions call `getSession` and refuse the public demonstration account; every write filters on the session's user id, so one person cannot change another's switches.

## Limits and next steps

- Text in a notice is the owner's English wording, not Welsh (offers and events have Welsh overlays elsewhere). Titles are plain text and cleaned by the notification service.
- Not built: per-kind switches, email for these notices, a "follow" button distinct from "save", quiet hours, push notifications, Welsh review by a fluent speaker.
