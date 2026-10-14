# Browse pages overhaul: offers, categories and guides

Status: shipped by the overhaul routine, 2026-10-14. Part of the free business website programme (doc 32) discovery work, following docs 42 to 45.

## Why

`/offers`, `/categories` and `/guides` were the last public browse pages still opening with a 420px hero. `/categories` was a 6,200px (phone) flat list of 24 identical cards with no counts; `/offers` had a bare three-field form with no category rail, ending-soon cue, sorting or numbered paging; `/guides` had no search, area filter or lead item.

## What changed

- **Shared browse kit** (`src/components/browse/`): compact header, sideways-scrolling pill rail, sort links, numbered pagination, one stylesheet using `--ov-*` tokens, reduced-motion safe.
- **Offers** (`/offers`): `offer-filters.ts` is the single URL-state model (search, category, place, "ending this week", sort, page). A category rail shows live counts under every other filter (`listOfferCategoryCounts`). Cards show a graded ending cue (today, within a week, later, ongoing), the place, and keep terms in a disclosure. Sort: ending soonest or newest. Numbered paging keeps every filter.
- **Categories** (`/categories`): `category-directory-model.ts` (pure) and `loadCategoryDirectory` (counts use the directory's own publication rules via `listCategoriesWithPublishedBusinesses`, so a number here equals what the category page lists). Search over names, Welsh labels and descriptions, "only categories with businesses", sort by most listed or A to Z, coverage stats, "most listed" shortcuts, and quiet dashed tiles for empty categories.
- **Guides** (`/guides`): `guide-filters.ts` (pure): search, area rail with counts, newest guide featured on the unfiltered view, and a clear empty state. Sponsorship disclosure is flagged on the card.
- **Welsh**: `messages/browse.ts` (EN and CY, parity-tested). Owner or editor written text (offer, business, guide and category descriptions) is tagged `lang="en-GB"`.

## Not changed

No migration, no change to authorisation, the public projection or any permission helper. Reads use the same public readers as before; no private field is added to any public shape (offers gained only `placeName` and `categoryName`, both already public on the business page).

## Known limits

Guides are filtered in memory over the published list, which is fine while editorial volume is small; add paging and a database filter if the published count passes about 100. The guide area rail matches on the free-text area label, not a place id. Welsh strings are first draft.
