# Offers studio

Route: `/dashboard/business/[businessId]/offers` (tab "Offers"; Welsh "Cynigion"). Implements doc 32 WP-11 (offers expire correctly) for the owner.

## Why

Offers were edited in the long operations page. An existing offer's dates, terms, button wording and link were submitted as hidden fields, so they could not be changed; nothing said whether an offer was live, scheduled or finished; a `datetime-local` value was read with the server's time zone rather than UK time; and the owner could not see how the offer would look.

## What it does

- **Lifecycle states** derived from the stored status and dates by the same rule the public site uses: *live*, *scheduled*, *draft*, *paused* (status `hidden`), *ended*. Offers are grouped by state with counts; live offers sort by earliest end, ended by most recent.
- **Plain-language guidance** per offer (ends within a day or a week, no end date, complete draft ready to publish, no picture, no link, thin description). Ended offers get none; they get a way back.
- **Quick actions** decided by the server against the locked row, not the page: publish, pause, resume, end now, extend by 7/14/30 days (from the current end, or from now if it has passed), and make a copy (an undated draft that shares the picture). A stale button cannot revive an ended offer; the result is reported.
- **Full editor** with every field, per-field error codes (translated in the browser), what was typed kept after a refusal, a live sketch of the public card, an optimistic-concurrency check (`expectedUpdatedAt`) so a stale form never overwrites a newer save, and the existing picture controls.
- **UK time.** Dates are read and shown in Europe/London, including the repeated hour in autumn (first occurrence) and the skipped hour in spring (moved forward).
- **Limits.** 100 offers per business, enforced under an advisory lock.

## Boundaries

No migration, no change to the public projection or to authorisation logic. Opening the studio and every action require `businessPermissions.manageContent` plus `canUseBusinessOperationsTools` (the public demo is read-only and blocked from actions). Everything is scoped by `businessId`; another business's offer id returns `not_found`. The owner tab and hub tile appear for anyone with the content permission (a new `canContent` flag in the tab access helper), not only those who can open the whole operations page. Audit entries: `business.offer_saved`, `business.offer_removed`, and the new `business.offer_state_changed`.

`readContentImageChange` moved from the operations actions into `content-image-form.ts` so the studio and the operations page share it.

The operations page keeps its offers section (with a link to the studio) for now.

## Not in this slice

Events get the same treatment next. Also left: Welsh offer text inside the studio (it stays in the Welsh tab), drag-to-reorder, scheduled "publish at" reminders, per-offer insight numbers, removing the older operations form.
