# 74. Offer pages and saved offers

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## What people get

Every live offer now has its own page, `/offers/[offerId]`, the way every event already has one.

- **Visitors** read the offer on its own page: picture (or a branded panel when there is none), a "ends today / tomorrow / in N days" badge, the business and place, the full wording, the button the owner chose (only plain web links are ever rendered), dates in UK time, terms and conditions, a share control, more offers in the same place, and a report link for the business. The offer is linked from the offers list, search results, place pages, the business website ("Offer page and sharing") and followed-business notices.
- **Shared links explain themselves.** An offer that finished in the last 60 days still opens, with an "This offer has ended" banner, no save or action button and `noindex`. Drafts, paused offers, offers not yet started, offers of unpublished businesses and anything older than 60 days past its end answer 404, so nothing private is revealed.
- **Search and social.** Live offers of real (non-demo) published businesses have `Offer` structured data, a canonical URL, an Open Graph share picture (`/offers/[offerId]/opengraph-image`, public text only) and a sitemap entry once the site is public. Demo and ended offers get no structured data and are not indexed.
- **Residents** can save an offer from its page (a sign-in is asked for first and they return to the offer). The saved page has an Offers tab (soonest-ending first, open-ended last; an offer that ends drops out of the list but stays saved). A saved offer produces one in-site notice shortly before it ends ("A saved offer ends soon"), which can be switched off on `/account/privacy` like any other kind. Saved offers are in the personal data download and in the "what we hold" counts, and go with the account.

## Data

- Migration `0062_saved_offer`: table `resident_saved_offer (user_id, offer_id, created_at, ending_notice_at)` with primary key `(user_id, offer_id)`, cascade on user or offer delete, and indexes on `(user_id, created_at)` and `offer_id`; and the notification and notice-mute kind checks are widened with `saved_offer_ending`. Additive: the previous release never writes the new kind and ignores the table, so rollback needs no data change.
- `ending_notice_at` holds the end time the notice was last raised for. If the owner moves the end later, the saver is told again near the new end.

## Rules

- Saving needs a session (reused `runSavedMutation`: anonymous visitors go to sign in, the shared public demo accounts are refused). Only an offer that is live now can be saved; every other id answers `not_found`, so a saver cannot probe drafts. One person can keep at most 200 saved offers.
- The ending job (`runSavedOfferEndingNotices`, run from the existing 30-minute followed-notices worker job) only considers verified, non-banned people, live offers of real published businesses, and the two British calendar days before the end. A muted kind raises nothing but is recorded as handled. It is idempotent (dedupe key per offer and end time).
- The action button accepts only `http` and `https` addresses (`safeOfferActionUrl`), opened in a new tab with `noopener noreferrer`.
- English and Welsh strings live in `src/lib/i18n/messages/offer-pages.ts`; Welsh is first-draft and needs review by a fluent speaker.

## Left for later

Reporting a single offer (the report link goes to the business; a per-offer report target needs a moderation schema change), offer codes or redemption, an offers Atom entry per offer, `/cy` URLs.
