# Homepage overhaul (`/`)

Slice of the overhaul programme (see `docs/36-overhaul-programme-log.md`). The hero, header and scroll-reveal system are unchanged; everything below the hero was rebuilt.

## What changed

- **Bilingual body.** Every string below the hero, the hero's preview cards and the footer now come from the catalogue (`src/lib/i18n/messages/home.ts`, keys `homex.*`, English and first-draft Welsh). Event and offer dates use the visitor's language and, fixing an earlier gap, London time. Dynamic business, event and guide content is English data and is tagged `lang="en-GB"`.
- **Live data, no invented businesses.** The three hard-coded fictional "different services" cards were replaced by the three newest published businesses (`listPublishedBusinesses({ sort: "newest" })`). Area tiles are ranked by published business count and show that count (same publication rules as the directory and `/map`); the featured business's place is always included. When the count query fails, tiles fall back to the plain place list without a number rather than disappearing.
- **Near you.** `src/components/home/near-you.tsx` asks the browser for a position only after the visitor presses the button, ranks the public place centroids it was given (`nearestPoints`, the same maths as `/map`) and links the three closest place pages. The position is never sent, stored or logged (an e2e test asserts no request carries it). Refusal, timeout, unsupported browsers and "outside the Valleys" each have their own message.
- **Compact phone layout.** The "one profile" pitch and the website-product section were merged (the duplicated bridge section was removed), the needs grid is two-up on phones and the area tiles are a horizontal snap rail. The page went from ~9,200px to ~7,000px at 390px wide.

## Data and privacy

No schema change and no new public field. `getHomepageDiscovery` now also returns `areas`, `nearPlaces` (slug, names and a public locality centroid only; asserted by a key-list test), `totalBusinesses`, `newBusinesses` and `newBusinessesState`. Each source still fails independently.

## Not built

A homepage map widget (the `/map` link covers it), saved searches, per-section Welsh review. Welsh strings are first-draft and need a fluent speaker's review before launch. Each request now runs two extra read-only queries (map counts, three newest businesses); cache them if homepage load grows.
