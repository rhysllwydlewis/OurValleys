# Business directory overhaul (`/businesses`)

Status: shipped with the discovery overhaul (see `docs/36-overhaul-programme-log.md`). Extends `docs/24` and `docs/33-stage-h-place-category-discovery.md`; no ranking, permission or projection rules changed.

## What changed for visitors

- **Compact search.** Search, category and place are the only controls always on screen. Everything else (near a place and distance, open now, verified only, step-free, Welsh-speaking, delivery, collection, emergency) is in a native `<details>` "More filters" panel that works without JavaScript and opens by itself, with a count, when one of its filters is active. On a phone the results are now reached after one short form instead of a screenful of controls.
- **Category rail.** Categories that currently have published businesses (scoped to the chosen place) appear as links with counts; the current one is `aria-current`.
- **Sort links** beside the result count replace the sort dropdown, so each sort order is a plain link that keeps every filter.
- **Active-filter chips** each remove just their own filter and reset paging; the radius leaves with the near place.
- **Richer cards.** Up to three services, the soonest-ending live offer, an open or closed note in words (not colour only) and the place. Open status uses the same London-time rule as the "open now" filter. The name is a real link and the whole card is clickable; the card lift is disabled for reduced motion.
- **Numbered pagination** (first, last, current and neighbours) with a range line ("Showing 25–48 of 61").
- **Map hand-off.** "View on the map" opens `/map`, with the chosen category carried across.
- English and Welsh (`src/lib/i18n/messages/directory.ts`).

## Code map

| Concern                                             | File                                                           |
| --------------------------------------------------- | -------------------------------------------------------------- |
| URL state: parse, build links, chips, paging window | `src/modules/businesses/directory-filters.ts`                  |
| Query, open status, offer, services per card        | `src/modules/businesses/public.ts` (`listPublishedBusinesses`) |
| Search form, card, pagination                       | `src/components/directory/`                                    |

All filter links are produced by `directoryHref`, which omits defaults and keeps the radius only with a near place; a unit test round-trips every filter through parse and build.

## Data and privacy

No migration and no new stored data. Card fields come from rows the directory already exposed: published services and offers and the opening hours the owner chose to publish. Offers and services are owner-typed text and are marked `lang="en-GB"` on Welsh pages. Business status filters (published, not suspended) apply before any of it is read.

## Not included

Ranking changes, saved searches, per-business map pins (addresses are not public) and new filters that need schema.
