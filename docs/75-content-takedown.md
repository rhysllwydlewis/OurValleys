# 75. Reporting and taking down offers and updates

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## Why

Offers (`/offers/[offerId]`) and business updates (`/updates`, `/b/[slug]/updates`) are public, owner-written content. Events could already be reported and removed by an administrator; offers and updates could not, so a scam offer or an abusive update had no route into the moderation queue. This closes that gap with the same shape events use.

## What people get

- **Visitors** see "Report this offer" on the offer page and "Report this update" under every update (the business website, the business updates page and the local updates feed). Each opens a short form at `/report/offer/[offerId]` or `/report/update/[updateId]` (reason, details, optional email; no sign-in needed, the signed-in account is recorded if there is one). The form is noindexed, and bilingual. A draft, paused, ended, removed or unknown item answers 404, so nothing private is revealed. If the item is taken down while the form is open, the visitor is told there is nothing left to report.
- **Administrators** see offers and updates beside listings, reviews and events at `/admin/reports` and on the review desk (`/admin/queue`), with a new type filter (`?type=offer|update|event|review|business`) that composes with the status filter. A suspected scam is treated as high risk on the desk. "Remove offer" and "Remove update" (with a confirmation) take the item down and resolve every open report on it in one transaction; resolved rows whose item is still removed show "Restore", which brings an offer back paused and an update back as a draft (never live) so the owner decides when it returns. Removal and restore are audited (`offer.removed_by_admin`, `offer.restored_by_admin`, `update.removed_by_admin`, `update.restored_by_admin`, plus `event.restored_by_admin`: a removed event can now be restored too, back as hidden).
- **Owners** see a taken-down offer or update in its own "Removed by an administrator" group in the Offers and Updates studios (and a notice on the operations page). It is read-only: it cannot be edited, republished, resumed, copied, ended, extended, unpublished or deleted, in either studio or the operations page, whatever the member's permissions. The reporter is never identified to the business.

## Data

- Migration `0063_content_takedown`: `content_report` gains nullable `offer_id` and `update_id` (cascade on delete) with indexes `(offer_id, status)` and `(update_id, status)`; the single-target check now requires exactly one of five targets; `business_offer` and `business_update` status checks gain `removed`. Constraint swaps run in one transaction and hold a short lock on small tables. The previous release never writes `removed`; if the release is rolled back while rows are `removed`, the old public queries (which select only `active`/`published`) still hide them, and the old studio shows them as a draft until the roll-forward. To tidy before a down-migration: set `removed` offers to `hidden` and `removed` updates to `draft`, and delete reports with an offer or update target.
- Removed rows are kept, not deleted, so the record of a takedown survives and an owner cannot delete a reported item to hide it. They still count towards the owner's per-business caps.

## Rules

- Public reports need no sign-in and are deliberately cheap to file, so abuse is bounded instead of blocked: one open report per person (account or email, case-insensitive) per item, and at most 25 open reports per item; further reports are acknowledged and dropped.
- Only an item that is live now can be reported (offer `active`, update `published` on a published business).
- Removal and restore go through `readAdminSession`; a report id for a different kind of target removes nothing.
- English and Welsh strings are in `forms.ts`, `offers.ts`, `updates.ts`, `offer-pages.ts`, `en.ts` and `cy.ts`; the Welsh is first-draft and needs review by a fluent speaker.

## Left for later

Telling the owner in the notification centre when something is removed (needs a new notification kind, its preference switch and mute-table check), an appeal path, a reason shown to the owner, reporting from search results and cards, and a takedown path for menus, gallery photos and news.
