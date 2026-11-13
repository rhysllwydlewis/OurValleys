# Editorial insights

Status: implemented (overhaul cycle, 2026-11-13). Owner: admin area.

## Problem

Business owners see which of their offers, events, updates and catalogue entries residents open (doc 93). The admins who write places, guides and local news had no equivalent: nobody could tell which pieces are read, which are never opened, or where readers come from.

## What it does

- **Beacon.** Place (`/places/[slug]`), guide (`/guides/[slug]`) and local story (`/news/[slug]`) pages send one anonymous beacon (`POST /api/editorial-view`) from the `EditorialPageView` client component. Only the kind, the item id and a coarse source label (the same fixed set as business traffic sources) are sent; never a referring address.
- **Server rules** (`recordEditorialView`). The item must exist and be public (active place, published guide, published story whose publish time has passed), so drafts, scheduled stories and unknown ids are never counted. A repeat open by the same visitor within 30 minutes counts once, serialised under a Postgres advisory lock. The source is folded onto the known labels. The route is rate limited (40 per minute per visitor signal) and ignores any client-supplied visitor value.
- **Admin page** (`/admin/insights`, inside the admin layout, so platform-admin access and two-step verification apply). Windows of 7, 30 and 90 days; totals per kind, a zero-filled daily chart (London days), the busiest items per kind with bars, public items nobody opened, and where readers came from. A failed read shows "could not be read" rather than zeros.
- **Business activity beacon.** `/api/business-activity` is now rate limited (120 per minute per visitor signal), closing the item left over from doc 93.

## Data and privacy

Migration `0076_editorial_view` is additive (one new table, no change to existing ones). Rows carry `kind`, `item_id`, `source`, a one-way SHA-256 visitor hash (the same helper as business analytics) and a timestamp: no user, session, address or user agent. `item_id` has no foreign key, so a removed item's history is pruned by age rather than blocking deletes. The daily retention job removes rows older than 400 days. Reverting the code leaves an unused table, which is harmless.

## Out of scope

Per-visitor journeys, search-engine impressions, business-owner access to these figures, outbound email digests, `/cy` URLs, any change to authorisation logic or the reserved projection.

## Tests

Unit: model helpers, both beacon routes (validation, throttling, no forged visitor). Integration (real Postgres): public-only counting, de-duplication, concurrent beacons, source and hash storage, ranking and windows, "not public" marking, retention. Playwright: signed-out denial, beacon refusal paths, an end-to-end open and admin read with an axe scan and a phone overflow check.
