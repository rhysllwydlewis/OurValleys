# Places overhaul (`/places` and `/places/[slug]`)

Status: shipped with the places overhaul (see `docs/36-overhaul-programme-log.md`). Extends `docs/33-stage-h-place-category-discovery.md`; no ranking, permission or projection rules changed, and there is no migration.

## What changed for visitors

- **`/places` is a browsable directory, not a flat list.** A compact header and four headline numbers (council areas, places, places with businesses, businesses listed), then one section per council area with its valleys and the towns and villages inside each. Every place tile shows its published-business count. Council areas with no businesses yet start collapsed (a native `<details>`, so it works without JavaScript); the founding area is open.
- **Search and filters** are a plain GET form: find a place by name, Welsh name or alias (case and accents ignored), narrow to one council area, or show only places with businesses. A search flattens to one list and says where each place sits ("Rhondda Cynon Taf · Rhondda Fawr"). Active filters appear as chips that each remove just themselves; an unknown or malformed area is ignored. The URL is canonical (`/places?q=&area=&active=1`) and defaults are omitted.
- **Place pages are richer.** A visible breadcrumb (council area, valley), a stats strip (businesses, live offers, upcoming events, places inside), a "Places in X" block, nearby places with business counts, a map hand-off (`/map?place=`), and the saved-place control moved to the foot of the page so it no longer interrupts the content.
- **A wider place now includes everything inside it.** Before, `/places/rhondda-fawr` and `/businesses?place=rhondda-cynon-taf` showed nothing because businesses are recorded against towns. A valley now includes its towns and a council area its valleys and their towns, for businesses, offers and events (`placeScopeCondition` and the matching recursive clause in the directory query). Cards on those pages say which place each business is in.
- English and Welsh (`src/lib/i18n/messages/places.ts`). Welsh is first draft.

## Code map

| Concern                                                       | File                                                |
| ------------------------------------------------------------- | --------------------------------------------------- |
| Pure model: tree, roll-up counts, grouping, search, URL state | `src/modules/reference-data/place-tree.ts` (tested) |
| Loader: places, parents, aliases, published counts            | `src/modules/reference-data/place-directory.ts`     |
| "Place and everything inside it" SQL                          | `src/modules/reference-data/place-scope.ts`         |
| UI                                                            | `src/components/places/`                            |

## Data and privacy

No new stored data. The loader reads only public reference data plus a count of published businesses per place, using the same publication rules as the directory and map (published business with a published site, not suspended, active primary location); an integration test checks the totals agree with the map and that the loader returns only the nine public place fields. No address, contact or business-level field is read. Recursion uses `union` so a cycle in the hierarchy cannot loop.

## Not included

Saved searches and place alerts for residents (need a table), per-place editorial pages and photography, a Welsh slug route (`/cy`), hierarchy-aware offers and events counts on the directory tiles.
