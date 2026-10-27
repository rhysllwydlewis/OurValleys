# Notification centre

Status: shipped as an overhaul slice (see `docs/36-overhaul-programme-log.md`).

## Why

Every resident and owner alert was email only: a missed or filtered email was a missed update, and nothing on the site said what had changed. The notification centre keeps the same alerts in the site, in the reader's language, behind an unread marker in the account menu.

## What a person sees

- **Account menu.** A "Notifications" entry with an unread count, and a dot on the "Account" button when anything is unread. The count comes from `GET /api/account/notifications` (signed-in only, `no-store`; 401 when signed out, 0 for the shared public demo accounts).
- **`/account/notifications`.** Groups (All, Saved and followed, My businesses), newest first, 20 a page. Each item opens its target and can be marked read or unread or dismissed; "Mark all as read" and "Clear read notifications" act on the signed-in person's own rows only. Empty, filtered-empty, demo-account, unavailable and outcome states are all worded. English and Welsh (first-draft Welsh, to be reviewed by a fluent speaker).
- Everything is plain HTML forms with server actions, so it works without JavaScript; only the account-menu count is client-side.

## What raises a notification

Raised only after the existing email has been sent, by the existing jobs, so an in-site notice never exists for a mail that failed:

| Source job | Kind | Dedupe key |
| --- | --- | --- |
| Saved-search alerts | `saved_search_results` | search id + result total |
| Event reminders | `event_reminder` | event id |
| Weekly saved-place digest | `place_digest` | day |
| Weekly owner digest (each active owner) | `owner_digest` | business id + day |

`raiseNotification` is best effort and never throws, so a notification failure cannot fail or repeat an email job.

## Data

`account_notification` (migration `0059`, additive): `user_id` (cascade on account deletion), `kind` (checked set), `params` (small plain-text values, markup characters stripped, 120 characters each), `href` (checked: site-relative only, no `//`), `dedupe_key` (unique per person when set), `read_at`, `created_at`. Rows hold a kind and parameters, never finished English, so the inbox renders them in the reader's language. A person keeps at most 200; the oldest go first. Read notifications are removed after 90 days by the daily retention job (`readNotifications` in the purge result).

## Privacy and safety

- Private to the person: every read and write filters by the signed-in user id; a notification id from another person changes nothing (`not_found`).
- No business content is copied beyond the names already present in the matching email.
- Links are validated twice (on write and on read) and rendered through `next/link`.
- No new email is sent and no external service is called.

## Left for later

Include notifications in the self-service data export; a notice when a business the resident follows posts an update; an owner notice for new enquiries and claim outcomes; a preferences screen per kind; realtime refresh of the menu count; Welsh review.
