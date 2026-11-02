# Local stories: pictures and scheduled publishing

Builds on `docs/76-local-stories.md`.

## What it does

- **Pictures.** A story can carry one optional picture, added in the story studio (JPEG, PNG or WebP, up to 5MB, a description required for screen readers, an optional Welsh description). It shows on the story page (above the text), on every story card (the `/news` block, `/news/archive`, the homepage, place pages and "more stories") and in the studio preview. Welsh readers get the Welsh description when the Welsh version is complete, otherwise the English one.
- **Scheduling.** A ready draft can be scheduled for a UK date and time between 10 minutes and 90 days ahead. A scheduled story is private (not in lists, search, the sitemap, the feed or its own page) until the worker publishes it. Admins can change the time, publish now, or cancel (back to a draft). At most 50 stories wait at once.

## Rules

- Only platform admins can add or remove a picture or schedule a story (`readAdminSession` on every action); each change is written to the audit log (`story.scheduled`, `story.picture_saved`, `story.picture_removed`).
- Pictures are stored on the story row (`image_storage_key`, `image_alt`, `image_alt_cy`, content type, size), not in `business_media`: a story belongs to the platform, not a business. Files live under `stories/<id>/`. The storage key never reaches the admin projection (it exposes only a public URL) and the public projection exposes only URL and description. Replacing or removing a picture, or deleting a draft, deletes the old file (queued for retry through the storage cleanup job if storage refuses).
- A scheduled story must keep passing the publishing bar (two paragraphs, a summary that differs from the headline) when edited; it cannot be deleted until moved back to a draft; published stories cannot be scheduled.
- The worker (`scheduled-stories`, every five minutes) claims each due story with a single conditional update on `status = 'scheduled'`, so an admin who moves it to draft, archives it or publishes it at the same moment wins and nothing is published twice. A due story that no longer passes the bar goes back to draft instead of going live. `publishedAt` is the moment of publishing.

## Implementation

- Migration `0066_story_pictures_scheduling`: additive columns on `local_story`, status check widened with `scheduled`, `scheduled` requires `scheduled_for`, a picture needs both key and description, partial index on due stories. The previous app version never reads `scheduled` rows as public (it only shows `published`).
- `src/modules/stories/picture.ts`, `scheduling.ts`, `admin.ts` (`scheduleStoryForAdmin`), `model.ts` (`parseStorySchedule`), studio (`story-studio.tsx`: Schedule and Picture panels), `story-cards.tsx` and `story-article.tsx` render the picture through the shared `ContentPicture`.

## Not done

A picture in the share image and the Atom feed, a focal point or crop, story-level scheduled-publish notifications, Welsh review by a fluent speaker.
