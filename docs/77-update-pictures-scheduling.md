# Business updates: pictures and scheduled publishing

Builds on `docs/69-business-updates.md`.

## What it does

- **Pictures.** Each update can carry one optional picture, uploaded in the Updates studio through the same pipeline as offer and event pictures (JPEG, PNG or WebP, up to 5MB, a description is required for screen readers). The picture is a `business_media` row with the new `update` role, so it never appears in the website gallery. It shows on the studio list, the business website block, `/b/[slug]/updates` and the `/updates` feed. A chosen file previews live beside the editor.
- **Scheduling.** A draft can be scheduled for a UK date and time between 10 minutes and 90 days ahead. A scheduled update is private (never in public lists, search, the feed or the publish log) until the worker publishes it. Owners can change the time, publish now, or cancel the schedule (back to a draft).

## Rules

- At most 20 updates waiting per business (`updateLimits.maxScheduled`). This stands in for the daily publish limit at publish time: a due update is never held back, but its publish is written to the publish log so the 10-a-day limit still counts it.
- Published updates cannot be moved back onto the schedule; withdraw them first.
- An administrator takedown (`removed`) still locks the update, including its schedule.
- `publishedAt` is the moment the worker publishes, not the planned time, so followers' notices (which scan recent publishes) never miss it.
- Pictures are checked server-side: the media must be an active `update` picture of the same business, otherwise the save is refused. Replacing or deleting an update retires its picture once no offer, event or update uses it.

## Implementation

- Migration `0065_update_pictures_scheduling`: `business_update.scheduled_for`, `business_update.image_media_id` (FK, set null), status check widened with `scheduled`, `scheduled` requires `scheduled_for`, `business_media` role check widened with `update`, partial index on due updates. Additive: the previous app version reads `scheduled` rows as drafts in the studio and never as public.
- `src/modules/businesses/update-scheduling.ts` (`publishDueUpdates`) runs every five minutes from the worker (`scheduled-updates` queue). Each update is published in its own transaction under the business's updates advisory lock, re-read `for update`, so an owner acting at the same moment wins cleanly and nothing is published twice.
- Welsh strings are first-draft and need review by a fluent Welsh speaker.

## Not done

Pictures for local stories (needs a story-owned media model), scheduling for stories, an Atom entry per update, a social share image per update, cropping or focal point for update pictures.
