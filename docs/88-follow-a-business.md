# Follow a business: feeds, calendar and the follow page

Residents could only follow the platform-wide feeds or the updates of one business. This slice lets anyone follow one business's updates, offers and events from the apps they already use, with no account.

## What a visitor gets

- `/b/[slug]/follow`: a themed page on the business website listing four ways to follow (updates, offers, events as Atom feeds, and a calendar subscription), each with the feed address in a read-only field, a copy button, an open link and the number of items now. The calendar card also has a `webcal://` "Subscribe in calendar app" link. English and Welsh interface text; feed items are English (a feed reader has no language preference). The page is `noindex, follow`, and links to "what you follow" for account notifications.
- `/b/[slug]/offers/feed.xml`, `/b/[slug]/events/feed.xml` (Atom) and `/b/[slug]/events/feed.ics` (iCalendar): public content of that business only. Entries use stable `urn:uuid:` ids so they survive a slug change; offers and events link to their own pages.
- Feed autodiscovery (`<link rel="alternate">`) for the three Atom feeds and the calendar on `/b/[slug]`, and a "Follow us" link in the business website footer (not in the owner's embedded preview).
- Sitemap: the updates list and every published update page of real, public businesses (same eligibility as the public resolver).

## Rules

- A feed shows only what the public page shows: published business, live offers, upcoming public events. An unknown, unpublished or suspended business answers the same plain 404; an outage answers 503 rather than an empty feed; a renamed slug redirects permanently (308) so subscriptions keep working.
- Demonstration businesses are labelled `[Demo]`, are `noindex` and never reach the sitemap.
- No schema change and no new dependency. Roll back with a plain revert. The existing `/api/events/feed.ics?business=` feed is unchanged.

## Not built

Welsh feeds, per-business JSON feeds, email digests of a single business, push notifications.
