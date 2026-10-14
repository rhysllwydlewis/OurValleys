# ADR-0012: Bilingual locale selection and URL strategy

- **Status:** Accepted
- **Date:** 2026-10-14
- **Owners:** OurValleys product and engineering agents
- **Related work:** issue #212, bilingual slices 1 to 6, `src/lib/i18n/`

## Context

English and Welsh are first-class. The interface already negotiates a language and renders Welsh across the public site, but the project never recorded how the language is chosen or why public URLs carry no language prefix. Future slices (a `/cy` route tree, `hreflang`, Welsh email) need this decision written down so they do not each re-argue it.

## Decision

1. **Selection order.** The language is read from, in order: the `ov-locale` cookie (httpOnly, one year), the signed-in resident's stored preference (`resident.preferredLanguage`, applied on sign-in so the choice follows them across devices), then the `Accept-Language` header, then English.
2. **No language in the URL for now.** One canonical URL serves both languages, and the language switcher is a no-JavaScript form that sets the cookie and returns to the same path (`return-path.ts` validates the return target).
3. **Content a business typed is data.** It is not translated automatically, carries `lang="en-GB"` while the page is Welsh, and Welsh equivalents (such as `welsh_name`) are optional owner-supplied fields.
4. **`<html lang>`** stays `en-GB`; regions that follow the reader's language carry their own `lang` until every remaining English surface (admin) is wrapped.

## Options considered

### Cookie and `Accept-Language` negotiation (chosen)

- Advantages: one canonical URL per page, so no duplicate-content or canonical-tag burden; no route-tree duplication; works without JavaScript; matches how the slices shipped so far.
- Disadvantages: a Welsh page cannot be linked to or indexed as Welsh; search engines see the default language only; sharing a link does not preserve the language.

### Locale-prefixed routes (`/cy/...`)

- Advantages: linkable and indexable Welsh pages; clean `hreflang` pairs; shared links keep the language.
- Disadvantages: every internal link, redirect, sitemap entry and e2e path needs the prefix; large mechanical change across the app; needs the content to be complete enough that Welsh URLs are not mostly English.

### Subdomain per language

Rejected: extra DNS and certificate work, a cookie-scope problem for sign-in, and no benefit over a path prefix at this scale.

## Consequences

- Welsh pages are not separately indexable yet. That is accepted while Welsh strings are first-draft and awaiting fluent review; indexing half-reviewed Welsh under its own URLs would be worse than not indexing it.
- **Revisit trigger.** Move to `/cy` routes with `hreflang` and per-language sitemap entries once (a) the Welsh review sheet has been corrected by a fluent speaker and (b) the main public surfaces, including business profile fields, have Welsh content. Per-language profile fields touch the public business projection and so need an owner decision first.
- Until then, new public surfaces must add both catalogues (the parity test enforces matching keys) and must not hard-code English in shared components.
- Emails are not yet language-aware; using the stored preference for them is a later slice.
