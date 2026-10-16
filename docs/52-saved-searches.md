# Saved searches

Part of the resident home work (see `docs/50-resident-home.md`). A resident can keep a search and see how many results are new since they last looked.

## Behaviour

- `/search` shows **Save this search** above the result tabs for a signed-in resident (a sign-in link that returns to the exact search for a signed-out visitor; nothing for the public demonstration account). Once kept, it is replaced by a link to the saved list, so it cannot be saved twice.
- A search's identity is the accent- and case-folded query plus the tab it was saved from (`all`, `businesses`, `offers`, `events`, `places`, `categories`, `guides`).
- `/account/saved?tab=searches` lists them with "N new results" (results now minus the number the resident last looked at, never negative), the total now, **Open search** and **Remove**. Open is a form action that resets the baseline to today's count and then redirects to `/search`, so "new" means new since the last time they opened it. If search cannot be counted, the card says so rather than showing zero.
- At most `MAX_SAVED_SEARCHES` (10) are kept: each count is a full site search, counted four at a time.
- **Email alerts are opt-in per search.** Each card has _Email me new results_ / _Stop email alerts_. A weekly worker job (Mondays 10:00, `saved-search-alerts` queue) sends one plain-text email per verified, non-banned resident listing the searches with results beyond both the last look and the last alert (`alertableNewCount`), then records the count it reported, so a result is never announced twice and a failed send is retried. Searches that cannot be counted completely are skipped. Every email carries a signed one-click unsubscribe link (`saved_search_alert`) that switches off alerts for that resident's searches only.

## Data

`resident_saved_search` (migration `0046`, additive): `id`, `user_id` (cascade delete with the account), `query`, `query_key`, `type`, `last_seen_total`, `last_seen_at`, `email_alerts` (default false) and `alerted_total` (nullable; migration `0047`, additive), `created_at`; unique on `(user_id, query_key, type)`; check constraints on type, query length and a non-negative baseline. Private to the resident: every read and write is scoped to the verified session's user id, never a submitted one.

## Code

- `src/modules/residents/saved-search-model.ts` (pure, tested), `saved-searches.ts` (service).
- `src/app/account/saved/actions.ts`: `saveSearchAction`, `removeSearchAction`, `openSearchAction` (session re-checked, demo account refused, off-site return paths ignored).
- `src/components/search/save-search.tsx`, the Searches section of `src/app/account/saved/page.tsx`.
- Strings: `messages/resident.ts` (EN, first-draft CY).

## Next

A per-resident alert frequency, "new" counts on the account home, saved filters for `/businesses` and `/events`, Welsh review by a fluent speaker.
