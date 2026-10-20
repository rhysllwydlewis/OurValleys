# Photos studio

Route: `/dashboard/business/[businessId]/photos` (tab "Photos"; Welsh "Lluniau"). Implements doc 32 WP-04 for the owner.

## What it does

- **Focus picker with live crops.** Click, drag or use the two sliders to choose the part of a photo that must stay in view. Four previews show the real crops (wide cover, side-by-side cover, directory card and gallery, square). The sliders are the real, form-posting controls, so keyboard, screen-reader and no-JavaScript use work; the pointer layer is an enhancement.
- **Description guidance.** Plain-language hints (missing, too short, too long, "photo of…", file name, all capitals). The server still only enforces its existing minimum (3 characters for cover and gallery photos).
- **Make this my cover photo.** `promoteGalleryMediaToCover` swaps a gallery photo with the current cover in one transaction under the media advisory lock; the old cover joins the end of the gallery, nothing is retired, and only one active cover can exist.
- **Gallery order** (drag and keyboard, reusing `GalleryOrderEditor`) and per-photo move earlier/later.
- **Confirmed removal.** A `<details>` confirmation (works without JavaScript).
- **Upload with a local preview** (focus and description before upload). Closed, with an explanation, when media storage is not configured.
- **Checklist** (logo, cover, three gallery photos, every photo described).

## Boundaries

No migration and no change to authorisation logic. Every action re-checks `canUseBusinessAppearanceTools` and `canUserAccessBusiness(editProfile)`, validates ids, and reuses the existing media module (tenant scoping by `businessId`). The public demo account can view but not change. The owner hub's "add photos" next step now links here. The older designer still has its photo forms.

## Not in this slice

Server-side cropping, rotation, multiple covers, alt text in Welsh, bulk upload.
