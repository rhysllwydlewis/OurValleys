# Valleys map (`/map`)

A tile-free map of the South Wales Valleys that answers "what is where, and what is near me" without a map provider.

## What it shows

- One bubble per active place that has a stored coordinate (`place_coordinate`). Area grows with the number of published businesses in that place; places with none are small grey dots.
- A category filter (`/map?category=<slug>`) that re-counts every place. An unknown or malformed category is ignored.
- A place panel: business count, the three most common categories (each links into the directory), "Browse businesses here", "Browse within 8 km" (the existing `near` and `radius` directory filters), a link to the place page, and "Suggest a business" for empty places. `/map?place=<slug>` preselects a place.
- "Use my location": the browser's geolocation is read and the three nearest places are computed in the browser (`nearestPoints`). The position is never sent to a server, stored or logged. A visitor more than 60 km from every place is told they appear to be outside the Valleys.
- A table below the map with the same information, so the page works without the SVG and without JavaScript. Places with no businesses sit in a collapsed `<details>`.

## Privacy and data rules

- Positions are public locality centroids, never business or resident addresses. No per-business pin exists.
- Counts use the same publication rules as the directory (`business.status = published`, not suspended, a published publication and site, an active primary location in an active place). An integration test asserts that the map count equals the directory total for every place, so the two cannot drift.
- The data function returns only place and category fields (asserted by key list in a test). Demo businesses count exactly as they do in the directory.
- Release controls are unchanged: the page uses `getPublicPageRobots()`, so it is `noindex` until the public stage, and it is not in the sitemap.

## Implementation

| Piece                           | Role                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/modules/businesses/map.ts` | `getValleysMap`: two read-only queries (categories with counts; places with per-category counts).      |
| `src/lib/map-projection.ts`     | Pure projection (equirectangular with a cos(latitude) correction), bubble radius, separation, nearest. |
| `src/components/valleys-map/`   | Client SVG map, place panel and geolocation. Bubbles are `role="button"` groups with keyboard support. |
| `src/app/map/page.tsx`          | Server page, category filter, list equivalent, unavailable state.                                      |
| `src/lib/i18n/messages/map.ts`  | English and Welsh strings, spread into the main catalogues.                                            |

Places that share (or nearly share) a centroid are nudged apart deterministically by a spiral so every bubble can be chosen. Radii and type scale up on narrow screens so bubbles stay legible and tappable. Reduced motion removes the entrance animation and transitions.

## Not built

Street-level or satellite tiles, routing, per-business pins, drawing arbitrary areas, saved locations. Any map provider would need a privacy, cost and CSP decision first. Welsh strings are first-draft and need review by a fluent speaker.
