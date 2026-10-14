# Resident home (`/account`, `/account/saved`)

Overhaul slice of 2026-10-14. A signed-in resident's account page used to be a generic welcome with three stat tiles ("Verified", "Member since") and a paragraph about saved items; `/account/saved` was a bare list. It is now a personalised "My valleys" home. No schema change and no migration.

## What a resident sees

`/account`:

- **Coming up** — saved events, plus events from saved businesses and inside saved places (a saved valley includes its towns), for the next 30 days. Grouped as "Today and under way", "Over the next week" and "Later this month", each with a one-line reason ("You saved this", "From a business you saved", "In a place you saved") and add-to-calendar (`/api/events/{id}/ics`).
- **Your saved businesses** — up to six, with the soonest-ending live offer ("ends today", "ends tomorrow", "ends in N days" inside a week) and the number of upcoming events.
- **New in your valleys** — the last two weeks of additions, reusing the weekly digest loader (`loadPlaceDigestContent`) so the page and the email can never disagree.
- **Your places** — each saved place with live business and upcoming-event counts (whole-place scope).
- **Suggested next steps** — at most three optional suggestions that are not already done (`residentNextSteps`).
- **Emails you have chosen** — digest and reminder state with one link to change them.
- Owners still see their business dashboards (first when they manage any, last otherwise). The public demo accounts never read or show saved items.

`/account/saved`: tabs (All, Businesses, Events, Places) with counts and `?tab=` URL state (unknown values fall back to All and are never echoed), richer cards, add-to-calendar on events, a removal confirmation, and removal that returns to the same tab.

## Design

- `src/modules/residents/resident-home.ts` — pure model: merging and grouping events (London days, so a 23:30 BST event is still that day), offer-ending wording, tab parsing, next steps. Unit tested.
- `src/modules/residents/resident-home-data.ts` — read-only loaders scoped to one user id from the verified session. Each source fails independently (`unavailable`) and the page says so instead of hiding it. Published, non-suspended businesses and active, unfinished events only.
- `src/components/account/resident-home.tsx` — server components, `--ov-*` tokens, no client JavaScript added.
- `src/lib/i18n/messages/resident.ts` — English and Welsh (first draft; needs fluent-speaker review).
- Owner-typed text (business, offer and event wording) carries `lang="en-GB"`.

## Fixed along the way

- Saved-business links on the old saved page pointed at `/businesses/{slug}`, which is a 404; the public business page is `/b/{slug}`.
- `listSavedDiscoveryForUser` takes an optional `now` so the lists are testable.
- 27 message keys used only by the old account and saved pages were removed.

## Tests

`src/modules/residents/resident-home.test.ts` (unit), `tests/integration/resident-home.test.ts` (real Postgres: merge and de-duplication, unpublished/finished/cancelled/distant exclusions, cross-user isolation, valley roll-up, invalid ids), `tests/e2e/account-home.spec.ts` (empty home, save, home panels, tabs, removal, axe, Welsh, signed-out redirect). `homepage.spec.ts` and `bilingual.spec.ts` were updated for the new heading.

## Not in this slice

Saved searches and alerts (need a table; the compatibility workflow hardcodes the migration count), snooze or "mark as seen" for new items, a month calendar of saved events, per-item notes.
