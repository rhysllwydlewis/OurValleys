# 86. Photos in Welsh, with captions

Status: built in the 2026-11-05 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

Photo descriptions (alt text) existed only in English and were announced as `en-GB` on Welsh pages, and the gallery lightbox showed that same alt text as its caption. Owners could not write a visible caption, and Welsh-language visitors got no Welsh text for pictures (doc 32 §7, WP-04/06; AGENTS.md bilingual readiness).

## What shipped

- **Data.** Migration `0068` adds three nullable columns to `business_media`: `alt_text_cy`, `caption`, `caption_cy` (length checks 300/160). Additive and backward compatible; the previous app version ignores them.
- **Rules (`media-text.ts`, pure).** English is canonical; Welsh only adds. `resolvePhotoText(fields, locale)` returns the description and caption for a reader, falling back _per field_ to the owner's English and reporting the language of each so the page marks it `cy` or `en-GB`. `cleanOptionalText` trims, collapses whitespace, bounds length and turns blank into null.
- **Photos studio.** A "Welsh and captions (optional)" group on every uploader and editor: Welsh description for logo, cover and gallery; English and Welsh caption for gallery photos. The studio shows "N of M photos have a Welsh description" and how many captions lack a Welsh version. A field not posted by an older form is left alone; one posted blank clears it.
- **Public site.** Gallery tiles carry the caption on a soft scrim; the lightbox shows the caption as visible text (or the description when there is none) and the image keeps the description as its accessible name. Each photo's `lang` is now its own (Welsh description → `cy`, English fallback → `en-GB`, generated "Photo 2 of 8" → page language). The cover photo's alt text is localised the same way. The gallery page's `ImageGallery` structured data includes `caption`.
- **Language.** EN/CY strings under `photos.words.*`. Welsh is first-draft and needs review by a fluent speaker.

## Not changed

No authorisation logic (the existing `readAuthorisedEditor` and `canUserAccessBusiness` are untouched), no change to the public projection, no `/cy` URLs. Gallery data still comes from `listBusinessMedia` (active public media only); the new fields are the owner's own public words, like the existing alt text.

## Tests

`media-text.test.ts`, `business-gallery-view.test.ts`, `structured-data.test.ts` (caption), `tests/integration/business-appearance-media.test.ts` (real Postgres: save/leave/clear semantics, cross-business denial, length check), `tests/e2e/business-photo-words.spec.ts` (English and Welsh public pages, per-field fallback, `lang`, axe, phone overflow), `tests/e2e/account-photos-studio.spec.ts` (owner saves and reloads Welsh words, coverage line, clearing). Existing studio label queries now use exact names because "Description" is a prefix of "Description in Welsh".

## Next

Crop tool, Welsh review by a fluent speaker, Welsh alt text for offer/event/update/catalogue pictures (they still use English alt text).
