# Search refinements

Status: shipped with the overhaul programme (see `docs/36-overhaul-programme-log.md`).

## Problem

`/search` finds businesses, offers, events, places, categories and guides in
one box, but a visitor could not narrow the results. The business directory
(`/businesses`) already has area, category, open-now and sort controls; the
whole-site search had none, so "heating, in Tonypandy, open now" meant
leaving the search for the directory and losing offers and events.

## Behaviour

- Four refinements, all in the URL so results can be shared and the back
  button works: `place`, `category`, `openNow=1`, `sort`
  (`relevance`, `az`, `newest`, `recently-updated`).
- They apply to businesses, offers and events together. `place` includes
  everything inside the place (a valley covers its towns), as in the
  directory.
- Places, categories and guides are named things rather than records to
  narrow, so they are left out while any refinement is on, and the page says
  so under the form.
- A native `<details>` disclosure holds a plain GET form (works without
  JavaScript, opens itself while a refinement is on). Each active refinement
  is also a removable chip, with "Clear all".
- Tabs, paging, "show all" links, the "all businesses in the directory" link
  and the out-of-range-page redirect all carry the refinements.
- Filters that remove every result show a dedicated empty state with a
  one-click way back, instead of the generic "nothing found" recovery.
- The choices offered are only places and categories that have published
  businesses. A stale or hostile value is parsed to nothing (slugs only,
  anything else becomes "not set") and never reaches SQL as free text.
- Saving a search keeps only words and tab, so the save control is hidden
  while a refinement is on rather than promise a filter it cannot keep.
- English and Welsh (first-draft Welsh, needs review by a fluent speaker);
  reuses the directory's labels for category, place, open now and sort.

## Code

- `src/modules/search/search-filters.ts`: state, parsing, links, tabs.
- `src/modules/search/site-search.ts`: passes the refinements to the existing
  public read paths (so no draft, suspended or private record can appear),
  returns `refineOptions`, `refined` and the echoed `refinements`.
- `src/components/search/search-refine.tsx`: the form and chips.
- No schema change and no migration.

## Tests

- Unit: `src/modules/search/search-filters.test.ts` (parsing, hostile values,
  round trip, tab links).
- Integration (real Postgres): `tests/integration/site-search.test.ts`.
- Playwright: `tests/e2e/search-refinements.spec.ts`; axe scans for refined
  and refined-to-nothing pages in `tests/e2e/accessibility.spec.ts`.

## Not done

Saved searches with filters, near-me radius in search, filters for guides and
places, a Welsh review by a fluent speaker.
