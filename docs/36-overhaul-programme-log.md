# Overhaul programme log

Newest first. Maintained by the `OurValleys overhaul build` routine so each fresh cycle knows what is done, in progress and next.

## 2026-10-08 — Owner dashboard gap programme, PR 1 (dashboard polish) — IN REVIEW (issue #358)

**Scope.** First chunk of the owner-dashboard gaps verified by a code audit of `main`. Fixes the stale "Coming later" chip on the Preview setup step (preview is always reachable; the chip now says "Ready to preview" once the profile and location are drafted or the business is published, with separate wording for the published case, and "Needs profile and location" otherwise). Adds a per-day website-views chart to the insights panel with a text-table equivalent (period-over-period comparison already existed). The chart uses exactly the same rolling window as the headline figures (starting period x 24 hours ago), so its bars add up to them; that window touches one more London calendar day than the period length, and the first day is flagged as a part day. Adds drag-and-drop gallery ordering with arrow buttons for keyboard, touch and screen readers; the existing per-image move forms remain as the no-JavaScript fallback. The save posts the complete order and the server rejects any order that is not exactly the current gallery (stale, duplicated or foreign ids), under the existing per-business advisory lock.

**Not in this slice.** Images on offers and events, owner slug-change request, owner-initiated ownership transfer, Organisation manager role, Welsh for the dashboard, and the decision record for approval-gated items are tracked in #358 as later PRs.

**Assumptions.** Daily buckets use the Europe/London calendar day. The existing `business.media_reordered` audit action is reused for drag-and-drop saves.

**Unconfirmed observation.** One local dev run logged a React hydration mismatch naming `OpeningHoursSection` on the operations page. It did not reproduce on this branch or on `main` in seven follow-up flows (it coincided with files being rewritten under the dev server), so it is recorded here rather than treated as a defect.

## 2026-10-08 — Bilingual English/Welsh (slice 2: account entry journey and events) — SHIPPED (PR #356, squash e689e86, verified live on production 2026-10-08)

**Shipped.** Welsh for sign-in (including second-step and resend-verification states), register, forgot-password and reset-password pages and their client forms, plus the events listing (filters, chips, empty and unavailable states, results, pagination, locale-aware dates). About 130 new catalogue keys in each language (parity test enforces both). Translated page regions carry their own `lang`; English event data and development demo copy are kept outside the Welsh language boundary. Page metadata is now locale-aware for these routes. Playwright covers the Welsh journey and adds Welsh axe scans (light and dark) for `/register`, `/forgot-password` and `/events`. No schema, auth-logic or permission-helper changes (Sensitive paths check clean locally).

**Left for the next slice.** Offers, place, event detail, news and guide pages; the development demo cards on the sign-in page (their copy lives in `src/lib/demo-account.ts` and is English-only, dev-only content); account menu and dashboard; per-language fields on the business record; `/cy` URL routes with `hreflang`; moving `<html lang>` once most routes are localised.

**Assumptions.** Welsh strings are first-draft and need review by a fluent Welsh speaker before public launch. This slice is smaller than the ~1,500-line target: it is a pure UI-string continuation, so most lines are catalogue entries, and offers were deliberately left to keep the slice fully validated.

## 2026-10-08 — Bilingual English/Welsh foundation (slice 1) — SHIPPED (PR #351, squash d7f2461, verified live on production 2026-10-08)

**Scope.** AGENTS.md makes bilingual readiness first-class, but the UI had no locale negotiation, message catalogues or language switcher. Slice 1 delivers: locale negotiation (cookie, then `Accept-Language`, default English), typed English and Welsh message catalogues with a parity test, a no-JavaScript language switcher (server action), Open Graph locale following the active language (`<html lang>` stays `en-GB` because most routes are untranslated; the translated header, footer, hero and directory carry their own `lang` attribute, and a later slice should move the document language once routes are localised), and Welsh for the shared site chrome (skip link, header, navigation, footer, sign-in) the homepage hero search and the whole business directory page (filters, chips, states, results).

**Out of scope for slice 1.** URL-prefixed locale routes and `hreflang` alternates, Welsh for business content (the canonical record has no per-language fields yet), policies, dashboard and admin, email templates.

**Assumptions.** Welsh strings are first-draft and need review by a fluent Welsh speaker before public launch. Locale is held in a first-party `ov-locale` cookie (no personal data).

**Known trade-offs.** The root layout now reads `cookies()`/`headers()`, so `/news` and the policy pages lose static prerendering (every other page was already `force-dynamic`). `/news` therefore pays its WalesOnline RSS fetch on a cold data cache instead of serving ISR; the feed fetch itself stays cached for 900 s. A later slice should restore static rendering for these routes (for example a client-resolved locale, or `/cy` URLs). The homepage desktop nav no longer shows the duplicate "My account" link (the account menu / sign-in action beside it covers it) so longer Welsh labels fit. The animated hero greeting still flips through the English word "Welcome to" before landing on "Lleol i".

**Next slice.** Translate sign-in/register forms, place, event, offer, news and guide pages; add per-language fields to the business record; consider `/cy` URL routes with `hreflang`.
