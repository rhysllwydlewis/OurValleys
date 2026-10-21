# Live opening hours

Surfaces: the business website `/b/[businessSlug]` (hero status and hours section) and the owner's hours editor on `/dashboard/business/[businessId]/operations#hours`. Implements doc 32 WP-07 ("is this business open now?") and part of WP-11.

## Why

The hours section of a business website was a flat list of strings. A visitor could not tell whether the business was open, when it closed or when it next opened; today was not picked out; a special day such as Christmas was a separate, unsorted note. Owners could not see how their hours (and special days) would read without opening the public page, and filling a Monday-to-Friday week meant typing eight times.

## What it does

- **Status model** (`opening-status.ts`, pure, no server-only imports). Given the weekly rules and special days it answers: _open_ (with the closing time and a "closing soon" state in the last 60 minutes), _opens later today_, _closed_ (with the next day it opens within 14 days, or the owner's reason on a special closure) or _unknown_ (no hours at all, so nothing is claimed). Everything is Europe/London wall-clock time. A special day replaces the weekly rule for its date, the same rule the directory's "open now" filter uses. Reversed, malformed or half-filled times are treated as closed, never guessed.
- **Public schedule read** (`public-opening-schedule.ts`). Weekly rules plus special days from today to 21 days ahead for the primary location, resolved from the business id. Only data already public on the page. Returns `null` on failure so the page falls back to the static list.
- **Business website.** A status chip in the hero (`Open now · closes at 17:00`, `Closing soon`, `Closed now · opens tomorrow at 08:00`, `Closed today · <reason>`), and the hours list with today highlighted (`aria-current="date"`, a "Today" tag, special-day hours applied). The server renders the first answer; the browser re-checks every 30 seconds and when the tab becomes visible, so a page left open never says "open" at midnight. Without script the server's answer stays. Colour is never the only signal (text says the state), the pulse on the open dot respects reduced motion, and forced-colours has a border/outline fallback. The live parts are left out for drafts and for a business that is paused, temporarily or permanently closed (the closure banner speaks instead).
- **Owner preview.** The hours editor opens with "How visitors see your hours right now": the live status and the next seven days with special days applied and labelled, in the owner's language.
- **Quick fill.** "Copy Monday to Tuesday–Friday", "Copy Monday to every day" and "Close Saturday and Sunday" rewrite the form only; nothing is saved until the owner presses save. A Monday with missing times is refused with an explanation, a no-op says so, and every outcome is announced in a polite live region.
- **Bilingual.** English and Welsh strings in `messages/live-hours.ts` (Welsh is first-draft and needs review by a fluent speaker like the rest of the catalogue).

## Boundaries

No migration, no change to `site-projection.ts` (the projection's display strings are unchanged; structured hours are read separately), no change to authentication or authorisation logic. The owner preview and quick fill live inside the existing editor, which already requires `editProfile` and the operations-route permissions.

## Known limits

- One opening period per day: split shifts (a lunch break) need a schema change and are the next slice.
- Bank holidays are not applied automatically; the editor still offers one-click closures.
- Status is for the primary location only.
- The directory card still shows a plain open/closed pill from SQL; richer wording there is follow-up.
