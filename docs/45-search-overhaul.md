# Search overhaul (`/search`)

Status: shipped with the search overhaul (see `docs/36-overhaul-programme-log.md`). Extends the discovery work in `docs/42-business-directory-overhaul.md`; no ranking, permission or public-projection rules changed, and there is no migration.

## What changed for visitors

- **A compact page that starts useful.** The 420px hero is replaced by the same compact header the directory, events and places pages use. Before anything is typed the page offers the visitor's own **recent searches** (kept only in this browser, with a clear button), **popular categories** and **places to explore** that really have published businesses (with counts), and quick routes (open now, offers, what's on, map).
- **Live suggestions.** The search box uses the same accessible combobox as the homepage and directory (`/api/search/suggest`, rate-limited, public projection only). It is still a plain GET form without JavaScript.
- **One search, all content types.** Results now include **offers** (live, published only) beside businesses, events, places, categories and guides. A result-type rail (`Everything`, `Businesses`, `Offers`, `Events`, `Places`, `Categories`, `Guides`) shows a count per type and hides types with none. Choosing a type shows that type in full: businesses, offers and events page 12 at a time, keeping the query; places, categories and guides list every match. A page past the end starts the tab over.
- **Best match.** When the query equals, or starts, a business, place or category name (case and accents ignored), a panel at the top leads straight there. Names that merely contain the words are left to the ordinary groups.
- **Category-led results.** When no business matches the words but a category does, the businesses of that category are shown with an explanation and a link to the whole category.
- **Business cards are the directory's cards** (services, live offer, open or closed now), so a result looks the same wherever it appears. Place and category chips show how many businesses they hold.
- **Nothing found is not a dead end.** Typo-tolerant "Did you mean" links (the suggestion engine's trigram match), categories to browse, and a way to suggest a missing business.
- **Safer matching.** A query made only of punctuation (`%%`, `__`) is no longer a search (the directory reads `%` and `_` as wildcards and answered with everything), and offers and events now escape wildcards inside a longer query.
- English and Welsh (`src/lib/i18n/messages/searchx.ts`). Welsh is first draft. Owner- and editor-typed text carries `lang="en-GB"` for Welsh readers.

## Code map

| Concern                                                                                                   | File                                                                      |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Pure model: URL state, tabs, best match, recent-search list (tested)                                      | `src/modules/search/search-filters.ts`                                    |
| Search across sources, start panel loader                                                                 | `src/modules/search/site-search.ts`                                       |
| Query normalisation and matching                                                                          | `src/modules/search/match.ts`                                             |
| UI: bar, tabs, sections, start panel, recent searches (the only client component besides the suggest box) | `src/components/search/`                                                  |
| Offers page size option, wildcard escaping                                                                | `src/modules/businesses/public-offers.ts`, `src/modules/events/public.ts` |

## Data and privacy

No new stored data and no migration. Every source is an existing public read path (published businesses through the directory, active offers, upcoming events, the active place hierarchy, active categories, published guides), so drafts, suspended or private records cannot appear; an integration test suspends the fixture business and checks it vanishes from businesses, offers and events and from the best-match panel. Recent searches live only in `localStorage` (try/catch around every access, so private windows simply have none) and are never sent to the server. `/search` stays `noindex`.

## Not included

Saved searches and alerts for residents (need a table, and the standard-Postgres workflow hardcodes the migration count), synonyms ("coffee" to cafés), ranking across types, news in search, searching inside one place from the search page. Known: the directory query itself still reads `%` and `_` inside a longer query as wildcards (this only widens a match across public data; fixing it means changing the large ranking SQL).
