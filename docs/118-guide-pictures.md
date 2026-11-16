# 118. Guide pictures

Status: built in the 2026-11-16 overhaul cycle (see `docs/36-overhaul-programme-log.md`). Mirrors the place-picture design in `docs/98-place-pictures.md`.

## Problem

Guides had no pictures of their own. The homepage matched each guide to one of three stock photos by its web address; the guides index, the related-guide cards, the place page and the guide itself were text only. Editorial content is where the premium, local feel in doc 18 should be strongest, and it was the plainest part of the site.

## What shipped

- **Additive migration 0077.** Six nullable columns on `guide` (`image_storage_key`, `image_alt`, `image_alt_cy`, `image_credit`, `image_content_type`, `image_byte_size`). Nothing is dropped or renamed; a guide without a picture behaves as before.
- **Picture module** (`src/modules/guides/guide-picture.ts`, pure rules in `guide-picture-model.ts`): upload, replace, edit the words only, remove, and an admin reader. Uploads go through the same `inspectImageUpload` check as every other picture (type sniffing, 5MB, dimensions). Replacement is compare-and-set against the key that was read, so a concurrent change wins and the losing upload's file is discarded. The old file joins the storage-cleanup queue in the same transaction that stops naming it.
- **The picture does not touch `guide.updated_at`.** That column is the version of the guide's words (the studio refuses a save over a newer version, and it is the article's "updated" date). Adding a picture therefore never invalidates an editor's unsaved draft and never claims the text was revised.
- **Picture card in the guide studio** (`/admin/guides/[guideId]`, Write tab): choose a file, see the wide article crop and the card crop side by side, English description (required, at least 3 characters), optional Welsh description, optional credit, Upload / Save description / Remove with an in-page confirmation. It saves on its own, separately from the guide's words. Actions `saveGuidePictureAction` and `removeGuidePictureAction` call `readAdminSession` first, are audited (`guide.picture_saved`, `guide.picture_removed`) and drop the cached guide lists and homepage. The studio's preview tab shows the picture, and "Before publishing" lists "Add a picture" as advice (never a blocker).
- **Public guide page:** a wide banner under the heading (21:9, 16:10 on phones) with the credit as a pill ("Photo: …" / "Llun: …"), and an `image` on the schema.org `Article`.
- **Guide cards everywhere now lead with a picture:** the featured panel and cards on `/guides`, the related guides under an article, the guides on a place page and the homepage strip. A card shows the guide's own picture, or the stock photo matched to its subject when it has none, so lists never mix cards with and without pictures. Stock photos are never shown as the article banner and never claimed as the Article's `image`.
- **Image optimiser.** `guides/**` joins `business/**` in the optimiser's allow-list (`src/lib/media-image-config.ts`), so a 5MB upload reaches a phone as a small modern-format copy. If the optimised copy cannot be loaded, the original file is shown.

## Language rules

The description is the editor's. Welsh readers get the Welsh description where one was written and the English one otherwise; English readers never see Welsh swapped in. The description is marked with `lang` only when it differs from the language of the article around it. The credit label is translated; the credit itself is the editor's words. Card pictures are decorative (`alt=""`) because the card's heading already names the guide.

## Security and privacy

Public editorial content only. Write paths are platform-admin only and tested for denial (signed-out and non-admin), malformed and unknown ids, non-image bytes, mislabelled and oversized files, storage switched off and a failed upload. A draft or archived guide's picture is never served by a public read. Descriptions and credits are rendered as text nodes. No personal data is collected. No authorisation logic, session handling or reserved file is changed.

## Accessibility

Labelled fields with hints, a polite status region, Enter in a picture field saves the picture rather than the guide, the banner has a real description, forced-colours styling for the credit pill and preview labels, reduced-motion support on the card hover, and axe (WCAG 2.1 AA) scans of an article with a banner and of the studio with the card.

## Limits and next

- Uploading a real file could not be exercised in a browser in the build sandbox or in CI because media storage is not configured there; it is covered by integration tests with only the storage boundary faked, and the public pages by browser tests with a seeded picture.
- Not built: a share image drawn from the picture, an enclosure in the guides feed, several pictures per guide, pictures inside sections, a focal-point picker (the middle of the picture is kept), `places/**` in the optimiser allow-list, and a Welsh review by a fluent speaker.
