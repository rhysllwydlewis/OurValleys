# Overhaul programme log

Newest first. Maintained by the `OurValleys overhaul build` routine so each fresh cycle knows what is done, in progress and next.

## 2026-10-08 — Bilingual English/Welsh foundation (slice 1) — IN PROGRESS

**Scope.** AGENTS.md makes bilingual readiness first-class, but the UI had no locale negotiation, message catalogues or language switcher. Slice 1 delivers: locale negotiation (cookie, then `Accept-Language`, default English), typed English and Welsh message catalogues with a parity test, a no-JavaScript language switcher (server action), `<html lang>` and Open Graph locale following the active language, and Welsh for the shared site chrome (skip link, header, navigation, footer, sign-in) and the homepage hero search.

**Out of scope for slice 1.** URL-prefixed locale routes and `hreflang` alternates, Welsh for business content (the canonical record has no per-language fields yet), policies, dashboard and admin, email templates.

**Assumptions.** Welsh strings are first-draft and need review by a fluent Welsh speaker before public launch. Locale is held in a first-party `ov-locale` cookie (no personal data).

**Next slice.** Translate directory, place, event, offer, news and guide pages; add per-language fields to the business record; consider `/cy` URL routes with `hreflang`.
