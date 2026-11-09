# Content performance (offers and events)

Owner insights (doc 74) measured the website as a whole. This slice adds per-item figures.

- **Counting.** `ContentPageView` (client) posts `{kind, itemId, source}` to `POST /api/content-view` when a non-demonstration offer or event page opens. The server reads the owning business from the item itself, never from the request, and counts only active offers, active or cancelled events, of published, non-demo businesses. Only a coarse traffic-source label is stored (never the referrer address); the visitor signal is hashed. Rows are `business_activity_event` with type `offer_view` or `event_view` and `metadata = {itemId}`.
- **Reporting.** `getContentPerformance` (owner insights, behind the existing `canUserAccessBusiness` gate) returns views for the chosen period and all-time saves per listed offer and event; a failed read is `null` so it never reads as "nobody looked".
- **Migration 0071** only widens the activity-type CHECK (additive; old code keeps working, new code before migration fails safe because insert errors are swallowed).
- **Known limits.** Counts include refreshes and bots, and the endpoint has no rate limit (parity with `/api/business-activity`). Welsh plural forms for "golwg" are first-draft.
- **Next slice.** Per-update and per-catalogue-entry views, de-duplicating repeat opens, rate limiting both beacon routes, Welsh review.
