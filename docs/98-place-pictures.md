# 98. Place pictures

Status: built in the 2026-11-11 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

Place pages (`/places/[slug]`) and the places index were text only. A town felt like a database row, and the premium, local feel in doc 18 had no imagery at the place level.

## What shipped

- **Additive migration 0074.** Six nullable columns on `place_profile` (`image_storage_key`, `image_alt`, `image_alt_cy`, `image_credit`, `image_content_type`, `image_byte_size`). No column is dropped or renamed, and a place without a picture behaves exactly as before. Saving the text profile never touches the picture columns, and the picture functions never touch the text.
- **Picture module** (`src/modules/reference-data/place-picture.ts`, pure rules in `place-picture-model.ts`): upload, replace, edit words only, remove, plus public readers (`getPlacePicture`, `listPlacePictures`) and an admin reader. Uploads go through the same `inspectImageUpload` check as every other picture (type sniffing, 5MB, dimensions). Replacement is compare-and-set against the key that was read, so a concurrent change wins and the losing upload's file is discarded; the old file is retired through the storage-cleanup queue only after nothing points at it. The profile row is created on first upload; an unknown or malformed place id never creates an orphan row or file.
- **Admin card** on `/admin/places/[placeId]`: choose a file (live banner-crop preview), English description (required, at least 3 characters), optional Welsh description, optional credit, Upload / Save description / Remove. Actions `savePlacePictureAction` and `removePlacePictureAction` call `readAdminSession` first, are audited (`place.picture_saved`, `place.picture_removed`) and drop the cached place tree.
- **Public place page:** a wide banner under the heading (21:9 on desktop, 16:10 full-bleed on phones) with the credit as a pill ("Photo: …" / "Llun: …"), and an `image` on the schema.org `Place` block.
- **Places index and "places inside" lists:** a small round decorative thumbnail on tiles for places with a picture, from one extra query for the whole directory.

## Language rules

The description is the editor's. Welsh readers get the Welsh description (marked `lang="cy"`) where written and the English one otherwise; English readers never see Welsh swapped in. The credit label is translated; the credit text itself is the editor's words.

## Security and privacy

Public editorial content only. Write paths are platform-admin only and tested for denial (signed-out and non-admin), malformed ids, non-image bytes, oversize files and unknown places. Descriptions and credits are rendered as text nodes. No personal data is collected, and the credit is plain text with a length bound.

## Accessibility

Labelled fields with hints, a polite status region, the banner `img` has a real description, the thumbnail is decorative (`alt=""`) because the tile already names the place, forced-colours styling for the credit pill, and axe (WCAG 2.1 AA) scans of a place page with a banner and of the editor.

## Not changed

No authorisation logic, no change to the reserved business projection, no `/cy` URLs, no outbound email.

## Out of scope and next

Pictures are served from the media host as stored (the Next image optimiser only allows `business/**` keys; a follow-up can add `places/**`), several pictures per place, resident-submitted pictures, a share image built from the picture, and a Welsh review by a fluent speaker.
