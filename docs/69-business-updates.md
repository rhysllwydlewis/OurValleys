# Business updates

Routes: `/dashboard/business/[businessId]/updates` (owner tab "Updates"; Welsh "Diweddariadau"), the "Latest updates" block on `/b/[slug]`, `/b/[slug]/updates` and the local feed `/updates`. Implements the "business update" content type of `docs/01-mvp-specification.md` §3.7.

## Why

A business had no way to tell visitors something short and timely ("closed on Monday", "new autumn menu") except by rewriting its description or abusing an offer or event. The MVP specification promises controlled local updates and nothing built it.

## What it does

- **Owner studio.** Write a headline and plain text (blank line between paragraphs), see a live preview, save a draft or publish. Published and draft updates are listed separately with quick actions (publish, unpublish, view on the website, delete with a confirmation step), an editor per update and plain-language tips (add Welsh, a half-written Welsh version, very short text, "ready to publish").
- **Welsh.** The Welsh headline and text sit beside the English. They are all-or-nothing: a half-written Welsh version is refused by the form, and the public reads show Welsh only when both fields are present, otherwise the English with the page's usual language tags.
- **On the business website.** The three newest published updates appear as a "Latest updates" section (and in the section navigation) between the owner's sections and the extra sections. A link to `/b/[slug]/updates` (paged, ten at a time) appears when there are more. A business with no published update shows no section and the updates page is a 404.
- **Local feed.** `/updates` lists published updates from every published business, newest first, with search (headline, text or business name), place and category filters, removable chips, numbered paging and clear empty and unavailable states. Linked from the footer.
- **Plain text only.** Text is stored and rendered as text (React escapes it). Control and zero-width characters are removed, blank lines collapse, and no markup, links or images are interpreted.

## Limits and abuse controls

- 200 stored updates per business; 10 publishes per business in any rolling 24 hours (drafts are unlimited within the cap). Both are enforced in the same transaction as the write under a per-business advisory lock, so concurrent requests cannot exceed them.
- Headline 3 to 120 characters, text 10 to 1,500; database check constraints repeat these limits and require a published update to carry a date.
- Saves carry the `updatedAt` the form was built from; a stale form is refused rather than overwriting a newer save.
- Visitors can report a business through the existing report flow linked from every business page; there is no separate update-level report in this slice.

## Boundaries

- Migration `0056` adds one table, `business_update`, with a cascading foreign key to `business`. It is additive; nothing the running app reads changes. The expected migration count in `standard-postgres.yml` is 57.
- Opening the studio and every action need `businessPermissions.manageContent` plus `canUseBusinessOperationsTools` (the public demo account is read-only and blocked from actions); everything is scoped by `businessId`, so another business's update id returns `not_found`. Audit entries: `business.update_saved`, `business.update_state_changed`, `business.update_removed`.
- Public reads never return drafts and the feed only returns updates of published businesses with an active primary location (the same conditions the offers feed uses). No change to the public business projection (`site-projection.ts`) or to authorisation logic; the website block reads updates separately, as live hours do.
- `/updates` is `noindex` while the site is pre-launch, like `/offers`. `/b/[slug]/updates` follows the business page (indexed unless the business is a demo).

## Not in this slice

Pictures on updates, telling people who saved the business (digest or email), an updates feed (Atom) like the offers one, an update-level report and admin takedown, scheduling a publish time, pinning, a "latest update" line on directory cards, Welsh review by a fluent speaker.
