# 58. Owner insights

`/dashboard/business/[businessId]/insights` (WP-13, doc 32). Added by the overhaul programme; see `docs/36-overhaul-programme-log.md`.

## What it does

- **Headline figures** for 7, 30 or 90 days against the period before: page views, approximate visitors, seen in search, got in touch (contact buttons plus enquiries) and QR scans.
- **What stands out**: up to four plain-language observations (`insights-model.ts#buildHighlights`). Each is a statement that is true of the numbers, never advice, and each has a minimum volume (10 views, 5 attributed visits) so a handful of visits is not called a trend.
- **Visits each day** and **Got in touch each day** bar charts, with a table alternative and a note that the first day of a rolling window is partial.
- **Where visitors came from**: QR code, the directory, search, the map, what's on, news and guides, the home page, a search engine, social media, another website, or direct.
- **From finding you to getting in touch**: appearances, visits and contacts as bars scaled to the largest number, with the share of visits that led to contact (capped at 100).
- **How people got in touch**: each contact button and enquiry form messages, and the area of the website a button was used from (main page, offers, events, menu document).
- **Busiest days of the week** and a **CSV download** of the daily figures (`/insights/export?period=`).

## Traffic-source attribution

`src/modules/businesses/traffic-source.ts` is shared by the browser and the server. The browser classifies `document.referrer` (and `?source=qr`) into one of eleven fixed labels and sends only the label; the referring address, path and query are never sent or stored. `/api/business-activity` re-validates the label for `website_view` events (unknown becomes `other_site`), so free text cannot reach an owner's page. Click events keep the page-area label they already carried (`business_website`, `offer`, `event`, `menu_document`); unknown values display as "Elsewhere".

Search engines and social networks are matched on the host with a public-suffix check, so `google.evil.example` is not classified as Google. Visits recorded before this change carry `direct`, `directory` or `qr` and fit the same set.

## Access

The page needs a signed-in member with `business.view_analytics` and is not available to the shared public demo accounts. A member whose role excludes analytics (an editor) sees a plain explanation and no figures are queried. The export route returns 401 signed out or for demo accounts, 403 without the permission and 404 for a malformed id. No schema change, no change to authorisation logic or the proxy.

## Privacy

Counting is cookie-free and stores a one-way hash of network address and browser, as before. "Approximate visitors" is the number of distinct hashes, labelled as an estimate. The CSV carries only dates and counts.

## Other changes

The operations tab is renamed "Content & offers" (its analytics section remains), the hub's "Full figures and trends" link and the weekly digest email now go to Insights.

## Welsh and testing

First-draft Welsh (needs review by a fluent speaker). Tests: `traffic-source.test.ts`, `insights-model.test.ts`, `tests/integration/business-insights.test.ts` (Postgres: grouping, tenant scoping, unknown ids, windows, CSV agreement), `tests/e2e/account-owner-insights.spec.ts` (redirect, denial, seeded journey, CSV, axe at desktop and 390px, Welsh).

## Not done

Per-offer and per-event analytics, returning-visitor measurement, comparison against similar businesses, scheduled reports, a configurable date range.
