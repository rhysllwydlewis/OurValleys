# Lean pages: the message catalogue and CSS leave every page

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## Problem

Measured on a production build with seeded data, on every public page:

| Cost on every page         | Before                                                     |
| -------------------------- | ---------------------------------------------------------- |
| HTML document              | about 360–405 KB, **90–95 KB compressed**                  |
| of which message catalogue | about 300 KB, **78 KB compressed** (87% of the transfer)   |
| JavaScript                 | a 281 KB chunk holding **both** language catalogues        |
| CSS                        | about 270 KB (two 118 KB files carrying other routes' CSS) |

The root layout passed the visitor's whole catalogue to a client component, so
it was serialised into every document, and `client.tsx` imported the translator
module that imports both catalogues, so both were bundled for the browser.

## What changed

- **One cached script per language.** `src/lib/i18n/catalogue-asset.ts` builds
  `/i18n/<locale>.<hash>.js` (served by `src/app/i18n/[asset]/route.ts`, pre-compressed with brotli or gzip because the platform does not compress route handler responses: 278 KB becomes about 60 KB) that
  assigns the catalogue to `globalThis.__OURVALLEYS_MESSAGES__`. The address
  contains a hash of the content, so a current request is
  `Cache-Control: public, max-age=31536000, immutable`; a request for an
  address this server does not recognise (a page from the previous release in a
  rolling deploy) gets current strings with `no-store`, so an old address can
  never pin outdated text. The first visit downloads the strings once; every
  later page costs nothing.
- **No catalogue in the bundle.** `translator.ts` holds the catalogue-free
  `createTranslator`; `client.tsx` imports only that. `translate.ts` keeps the
  server translators, which fall back to English for a missing key as before.
- **Server rendering needs no payload.** `publishServerMessages()` (called by
  the root layout) puts the same object on the server's `globalThis`, so client
  components render on the server from it. The browser reads the same global,
  filled by the script, which is a parser-blocking script at the start of
  `<body>` so it always runs before hydration.
- **Language switch without a reload.** The switch is a server action followed
  by a soft navigation; the new language's script arrives with the new layout.
  A `<script>` that React inserts during a soft navigation does not execute, so
  `LocaleProvider` loads the new language's script itself, keeps the previous
  language on screen until it has arrived (checked every 50 ms), then re-renders. If it has not arrived after 3 s
  (a blocked script, a very old tab) it reloads once (never twice within 10 s, so
  a blocked script cannot cause a loop); the choice is already stored.
- **Route-scoped CSS.** `experimental.cssChunking: "graph"` (Turbopack) stops
  merging unrelated routes' stylesheets. Rendered pages were compared pixel for
  pixel before and after at 1440 and 390 px: no difference except the homepage
  headline's rotating word.
- **Budget.** `tests/e2e/performance-budget.spec.ts` fails if a public page's
  HTML exceeds 40 KB compressed, carries catalogue text, loads more than 160 KB
  of CSS, or if the catalogue stops being one shared immutable script; it also
  checks the language switch needs no reload.

## After (same pages)

| Cost on every page | After                                                          |
| ------------------ | -------------------------------------------------------------- |
| HTML (compressed)  | **16–20 KB** (was 90–95 KB)                                    |
| Catalogue          | one script, about 60 KB compressed, once per language per year |
| CSS                | **38–114 KB** (was 262–286 KB)                                 |

## Not done (next slices)

- **better-auth client in every page.** `site-nav.tsx` imports the auth client,
  which pulls zod (about 107 KB of JavaScript) into every route. Deferring it
  to the account menu touches the reserved authentication surface
  (`src/lib/auth-client.ts` and session handling), so it needs an owner
  decision first.
- Per-route message scoping (the catalogue is about 245 KB uncompressed in the
  browser once per language; a scoped catalogue would shrink the first visit).
- Hero image weight and font subsetting.
