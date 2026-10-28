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
- `job_cursor` (new table) stores where the `followed-notices` job stopped. Each run (every 30 minutes) covers the time from the cursor to two minutes ago (so a row that commits just after a run is still seen), at most 24 hours back, and one hour on the first ever run so switching the job on does not announce old posts. The scan reads _items_ first (500 per kind) and then their followers, so a business with many savers is never cut off. A write failure throws before the cursor moves, so the same window is retried; only a person deleted mid-run is skipped. If a scan hits its item limit the cursor stops just before the last item read and the next run continues. The cursor never moves backwards.
- A notice is raised through `raiseNotification` with the dedupe key `follow:<kind>:<item id>`, so a retried or overlapping run, or a post that is unpublished and republished, never notifies twice. At most 12 notices per person per run: the newest are kept and any beyond that are skipped, not carried over. If a person dismisses a notice and the same item is edited again later while still inside a scan window it can be announced again (dismissal deletes the row that holds the dedupe key).
- Who is notified: the saver is verified and not banned, the switch is on, and the business is published, not suspended and not a fictional demonstration business. Updates count when published. Offers count when they were last switched on or edited, or when their start date arrives, whichever is later, and events when last switched on or edited; both must be active, not yet over, and created in the last 14 days (older ones are never announced, however edited).
- `account_notification_kind_check` now allows the three new kinds. The migration (`0060`) is additive; the previous release never writes the new kinds, so rolling the code back leaves them harmlessly unused.
- `/account/following` reads only public, published content and only the signed-in person's own saved rows. Actions call `getSession` and refuse the public demonstration account; every write filters on the session's user id, so one person cannot change another's switches.

## Limits and next steps

- Text in a notice is the owner's English wording, not Welsh (offers and events have Welsh overlays elsewhere). Titles are plain text and cleaned by the notification service.
- Not built: per-kind switches, email for these notices, a "follow" button distinct from "save", quiet hours, push notifications, Welsh review by a fluent speaker.
