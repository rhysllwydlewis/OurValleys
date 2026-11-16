# 119. Nearby page and offers "Near me"

Status: built in the 2026-11-16 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

"Near me" exists on the directory (doc 101) and on events (doc 102). A visitor on a phone still had to open three pages to learn what is around them, and offers could not be narrowed by distance at all.

## What ships

### `/nearby`

- Choose a town and a distance (3, 8, 15 or 30 km), or press "Near me". The page then shows, for that place and distance:
  - four counts (open now, businesses, events coming up, current offers), each jumping to its section;
  - businesses open now, nearest first. When none says it is open, the nearest businesses are shown instead and the heading says so;
  - the next events, grouped by day;
  - current offers, ending soonest first;
  - neighbouring towns with their distance. Each moves the page to that town and keeps the distance.
- Every section has a "see all" link to the full list (`/businesses`, `/events`, `/offers`) with the same `near` and `radius`, so the count shown and the list opened agree.
- States: no place chosen (town chooser with starting towns), unknown place, nothing in range (with a "look within the next distance" link), data unavailable.
- Links to the page: the homepage quick actions and footer, the site footer, the "Nearby places" section of every place page, and the filter row on `/offers` when a distance is set.
- The page is `noindex`, as the other filter views are.

### Offers

- `near=<place slug>&radius=<3|8|15|30>` on `/offers`: only offers from a business whose place centre is within the distance of the chosen place's centre.
- A "Distance" panel in the search form, the "Near me" button, a removable chip, an empty-state sentence naming the distance and place, and the filter carried through the category rail (its counts too), sort links, the "ending this week" switch and paging.

## How it works

- `src/modules/nearby/nearby-filters.ts`: URL state, links, distance labels (pure).
- `src/modules/nearby/nearby-model.ts`: neighbouring places, empty check, next wider distance (pure).
- `src/modules/nearby/nearby.ts`: `loadNearby`, which calls the same public list functions the three list pages use (`listPublishedBusinesses`, `listPublicEvents`, `listPublicOffers`). No new query reads business data, so nothing unpublished or private can appear here that cannot appear there.
- `src/modules/businesses/offer-filters.ts` and `public-offers.ts`: the `near` and `radius` filter, using `withinKmOfPlace` (doc 102).
- `src/components/directory/near-me-button.tsx`: two more scopes, `offers` and `nearby`.

## Privacy

Distances run between public place centres, never addresses. "Near me" reads the device position only when pressed, uses it in the browser to pick the nearest town, and sends only that town's slug. The position is never sent, stored or logged; browser tests assert that no request carries it.

An unknown `near` value on `/offers` is ignored (the plain list is shown, with no chip). On `/nearby` it is explained. Values that are not a slug are dropped before any query.

## Also fixed

The site footer's policy links were laid out by a rule that matched the English label of the list, so in Welsh the footer broke at tablet widths. The rule now uses a class.

## Not changed

No schema or migration, no authorisation logic, no change to the reserved business projection, no `/cy` URLs.

## Known limits

- The page streams behind a loading state like `/offers` and `/events`, so the first view needs JavaScript; the forms themselves are plain GET forms.
- The business cards show kilometres, as the directory does; place pages show miles.
- Welsh is first-draft and needs review by a fluent speaker.

## Next

- `near` and "Near me" on `/search`, and saved searches that keep refinements.
- Saved offer searches.
- A small map of what is in range on `/nearby`.
