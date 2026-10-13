# Admin review desk (`/admin/queue`)

Status: shipped (PR #421, squash 2ebd7f3), 13 October 2026. Part of the trust tooling in `docs/32` WP-09 and WP-10.

## Why

Work waiting on a platform admin was spread across four screens: businesses awaiting review, claims and corrections tickets, public suggestions and content reports. Nothing said what to do first, how long things had waited or which were risky.

## What it does

- One list of every open item from those four sources, most pressing first.
- A tested ranking (`src/modules/admin/review-desk.ts`), sorted in this order: high risk, then urgency, then kind (report, claim or correction, business review, suggestion), then oldest first. Age never overrides kind.
- Scope: business reviews, tickets, reports and suggestions. Overdue guide reviews stay on the Guides screen (a possible future kind).
- The existing readers cap rows (200, tickets 250); when a source reaches its cap the desk says counts are a minimum.
- Response targets: 24 hours for high risk; 48 hours for reports; 72 hours for tickets and business reviews; 7 days for suggestions. An item is "due soon" at 75% of its target and "overdue" at 100%.
- Risk: tickets use their stored risk level; reports about abusive or inappropriate content are treated as high risk; everything else is standard.
- Filters by kind and urgency through the URL (`?kind=`, `?urgency=`); unknown values are ignored.
- Reports and suggestions can be resolved in place using the existing audited row actions. Tickets and business reviews open on their existing screens, where the evidence and resolution rules live.
- A live count badge on the "Review desk" navigation link and a "Needs you" panel on the overview.
- Each source degrades on its own: if one cannot be read the page says so instead of showing a falsely empty desk.

## What it does not do

It adds no tables, no migrations and no new write paths. Authorisation is unchanged: the admin layout guards the route and every resolution action still calls `readAdminSession` itself. The public admin demonstration account sees only its sanitised overview, never this page's data.

## Follow-ups

Assignment to a named admin and snooze (needs a table), resolving tickets in place, bulk actions, email or push digests of overdue items, per-admin response-time reporting.
