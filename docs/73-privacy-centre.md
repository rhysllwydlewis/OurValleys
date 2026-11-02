# 73. Privacy and notification centre

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## What residents get

`/account/privacy` is one signed-in page that answers three questions:

1. **What do you hold about me?** Live counts of saved businesses (and how many do not notify), places, events, searches, in-site notifications, reviews, reports filed and business team roles. Every count is scoped to the signed-in user.
2. **What am I told about?** One checkbox per in-site notice kind (saved-search results, event reminders, saved-places summary, followed updates, offers, events, owner weekly summary). Unticking a kind stops it being raised in the notification centre. Emails are unaffected and keep their own switches in account settings and on each saved search.
3. **Can I take it with me, or leave?** The data download and the delete-account entry point sit on the same page.

## Data

- Migration `0061_resident_notice_mute` adds `resident_notice_mute (user_id, kind, created_at)`, primary key `(user_id, kind)`, cascade on user delete, and a check constraint on the kind. A row means the kind is muted, so an absent row is "on": new kinds default to on and nobody who never opens the page changes behaviour. The migration is additive and the previous release ignores the table (rollback needs no data change).
- `raiseNotification` checks the mute table first and returns `false` for a muted kind, exactly as it already does for a duplicate. Producers that run on a cursor treat `false` as "nothing raised", so a muted kind never blocks a scan.
- `buildUserDataExport` now also returns `savedSearches`, `notifications`, `mutedNoticeKinds` and `notifyOnUpdates` on each saved business, closing the gap left by the saved-search, notification-centre and following slices.

## Rules

- The save action requires a session, refuses the shared public demonstration accounts, validates the user id and accepts only known kinds (a forged value is ignored). Saving replaces the caller's own rows in one transaction and cannot touch another person's.
- The page reads a mute lookup failure as "none muted", so a database blip never silences a notice.
- English and Welsh strings live in `src/lib/i18n/messages/privacy.ts`; Welsh is first-draft and needs review by a fluent speaker.

## Left for later

Per-channel email switches on this page (they live in settings), a retention schedule shown per data kind, export as a downloadable ZIP with media, scheduled export links by email (an external message: needs an owner decision).
