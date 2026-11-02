# Catalogue entries: pictures, availability and order/book links

Builds on `docs/59` (extra sections) and doc 32 §8 and §11.3.

## What it does

- **Pictures.** Each entry of a products, treatments or team section can carry one optional picture (a photo for people), uploaded in the section editor through the same pipeline as offer, event and update pictures (JPEG, PNG or WebP, with a required description). On the business website any picture turns a products or treatments list into a card grid; a team picture replaces the initial letter. A section with no pictures looks exactly as before.
- **Availability (products only).** In stock (unmarked default), Limited stock, Made to order, Sold out. A sold-out item is dimmed and has no order link.
- **Order or book link.** Products and treatments may carry one https address on the business's own site ("Order online", "Book online"). It opens in a new tab with `rel="noopener noreferrer nofollow"` and names the item and the new tab for screen-reader users. Our Valleys does not take payments.

## Rules

- Addresses must be https, have a dotted host, no credentials and at most 300 characters; a bad address refuses the whole save and names the row.
- Up to 30 pictures per section and 240 active catalogue pictures per business (`contentImageLimits.catalogue`).
- Entries store `imageMediaId`, `availability` and `url` inside the section JSON (no new table). The media row has the new `catalogue` role, so it never appears in the website gallery.
- The form's "keep this picture" id is untrusted: a picture is kept only if the section's saved entries already show it (read for the same business), and `saveCategorySection` independently refuses any picture id that is not an active catalogue picture of that business.
- Order of operations in `saveSectionWithPictures`: store new files, save the section, then retire pictures the save stopped using. If the save fails the new uploads are released again. A retired picture's file goes through the storage cleanup queue.
- Reference counting for release (`countPictureUses`) includes a jsonb containment query on `business_category_section.content`.
- A file chosen on a row with no name, or on a section type without pictures, is refused rather than silently dropped.

## Implementation

- Migration `0067_catalogue_entries`: `business_media_role_check` widened with `catalogue` (additive; the previous release never writes the new role).
- `extra-sections-model.ts` (form parsing, `cleanEntryUrl`, availability), `extra-section-pictures.ts` (upload/keep/replace/remove orchestration), `content-features.ts` (entry schema, ownership check, pictures resolved in `listCategorySections`), `content-images.ts` (`catalogue` kind).
- Editor: `extra-sections-editor.tsx` (per-row picture, description, availability, link; plain HTML forms, multipart). Public: `business-extra-sections.tsx` and its CSS.
- English and Welsh strings (`extra-sections.ts`); the Welsh is first-draft and needs review by a fluent speaker.

## Not done

Crop or focal point for catalogue pictures, drag-reorder of entries, a product detail page, categories within a products section, Welsh text for individual entries, pictures for the other section types.
