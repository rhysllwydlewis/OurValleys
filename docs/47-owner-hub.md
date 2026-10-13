# 47. Owner hub

Implements the owner-journey part of `docs/32` (WP-09 dashboard clarity, §15.4 simple analytics, §5 end-to-end business journey). Built by the overhaul routine on 2026-10-13. No migration.

## Problem

`/dashboard/business/[id]` was one 6,300px page of empty forms ("0 of 7 draft edits updated, 0%" on a business that was already live), with no navigation between profile, website design, preview and content and insights, and nothing that said how the business was doing or what to do next.

## What the hub is now

| Route                                 | Purpose                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/dashboard/business/[id]`            | Hub: next steps, performance at a glance, manage grid, setup checklist, publishing panel        |
| `/dashboard/business/[id]/profile`    | The profile editing forms (moved here unchanged), or the read-only profile for viewers          |
| `/website`, `/preview`, `/operations` | Unchanged pages; each now carries the shared tab bar. Operations also gets an in-page jump bar. |

**Tab bar** (`_hub/dashboard-tabs.tsx`). One sticky glass bar on every dashboard page: Overview, Profile, Website design, Preview, Content and insights. It only links, and each page still authorises on its own, so showing a tab grants nothing. The public development demo does not see the two tool tabs (as before).

**Next steps** (`owner-hub.ts`, pure and tested). At most four, most important first:

1. `suspended` (always leads and stops the list), `changes_requested` (rejected, editors only).
2. `reply_enquiries` for enquiries still `new` or `read`; urgent after 3 days waiting.
3. While a draft or rejected: the missing setup steps in order, then `submit_for_review` (only for someone who can publish). While in review: `in_review`.
4. Optional growth prompts: contact options, logo then photos; once live also an offer, an event and the weekly email.

Viewers (no edit right) never get edit prompts; they still see an enquiry waiting. An empty list shows an "all caught up" state.

**Performance** (`owner-hub-data.ts`). Page views, search appearances, contact clicks and enquiries for the last 30 days with the change against the 30 days before (the existing `describePeriodChange` rules: no percentage against a zero baseline), a small per-day bar chart with a text summary, an honest empty state, and a link to the full insights section. Reads reuse `getBusinessAnalyticsSummary` and `getBusinessDailyActivity`; every reader fails soft to zero or empty.

**Manage grid.** Nine tiles deep-link to the real sections (profile, website design, photos, enquiries with a waiting badge, offers, events, menu, team and settings, QR code, public page). Public page and QR show as disabled until the page is live.

**Published businesses.** The misleading draft-progress bar is hidden once live and the seven-step checklist sits behind a disclosure; the checklist and the publishing panel are otherwise unchanged.

## Authorisation and privacy

No authorisation logic changed. The hub keeps its three `canUserAccessBusiness` checks (view, edit profile, publish) and its session check; the new profile page repeats the view and edit checks; the loader runs only after the page has authorised the viewer. Every query is keyed to the authorised business id. Nothing private is added to any public projection. `isPublicDemoEmail` still gates the tool tabs and tiles; the proxy still redirects the demo away from `/website` and `/operations`.

## Tests

- Unit: `owner-hub.test.ts` (ordering, suspension/rejection, urgency, viewer rules, cap, hrefs).
- Integration (real Postgres): `owner-hub-data.test.ts` (empty business, waiting enquiries counted per status and per business, live offers only, digest switch, activity isolation between businesses, unknown business).
- Playwright: `owner-hub.spec.ts` (hub, profile tab round trip, preview tab, invalid id 404, signed-out redirect, non-member 404, axe in English and Welsh, no horizontal scroll at 390px). `bilingual.spec.ts` and `development-demo-access.spec.ts` were updated because the editing forms and the read-only profile moved to the Profile tab.

## Not in this slice

Per-day contact and enquiry series on the hub, snooze or assign, notification preferences, editing the profile of a business with several locations, a guided first-run checklist for brand-new businesses (the setup steps list covers it for now), per-member views. Welsh strings are first draft.
