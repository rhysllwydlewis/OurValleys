# Overhaul programme log

Newest first. Maintained by the `OurValleys overhaul build` routine so each fresh cycle knows what is done, in progress and next.

## 2026-10-08 — Bilingual English/Welsh (slice 2: account entry journey, events, offers) — IN PROGRESS

**Scope.** Continues slice 1's concrete next slice. Translate the sign-in, register, forgot-password and reset-password pages and their client forms (including second-step and resend states), then the events and offers listing pages, using the existing catalogue and parity test. No schema changes, no change to auth logic: strings only, existing guards untouched.

**Out of scope.** `/cy` URL routes and hreflang, Welsh business content, dashboard/admin, email templates.

## 2026-10-08 — Bilingual English/Welsh foundation (slice 1) — SHIPPED (PR #351, squash d7f2461, verified live on production 2026-10-08)

**Scope.** AGENTS.md makes bilingual readiness first-class, but the UI had no locale negotiation, message catalogues or language switcher. Slice 1 delivers: locale negotiation (cookie, then `Accept-Language`, default English), typed English and Welsh message catalogues with a parity test, a no-JavaScript language switcher (server action), Open Graph locale following the active language (`<html lang>` stays `en-GB` because most routes are untranslated; the translated header, footer, hero and directory carry their own `lang` attribute, and a later slice should move the document language once routes are localised), and Welsh for the shared site chrome (skip link, header, navigation, footer, sign-in) the homepage hero search and the whole business directory page (filters, chips, states, results).

**Out of scope for slice 1.** URL-prefixed locale routes and `hreflang` alternates, Welsh for business content (the canonical record has no per-language fields yet), policies, dashboard and admin, email templates.

**Assumptions.** Welsh strings are first-draft and need review by a fluent Welsh speaker before public launch. Locale is held in a first-party `ov-locale` cookie (no personal data).

**Known trade-offs.** The root layout now reads `cookies()`/`headers()`, so `/news` and the policy pages lose static prerendering (every other page was already `force-dynamic`). `/news` therefore pays its WalesOnline RSS fetch on a cold data cache instead of serving ISR; the feed fetch itself stays cached for 900 s. A later slice should restore static rendering for these routes (for example a client-resolved locale, or `/cy` URLs). The homepage desktop nav no longer shows the duplicate "My account" link (the account menu / sign-in action beside it covers it) so longer Welsh labels fit. The animated hero greeting still flips through the English word "Welcome to" before landing on "Lleol i".

**Next slice.** Translate sign-in/register forms, place, event, offer, news and guide pages; add per-language fields to the business record; consider `/cy` URL routes with `hreflang`.
