# 85. Photo gallery: lightbox, gallery page and layouts

Status: built in the 2026-11-04 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

Gallery photos on a business website (doc 32 §7, WP-04 and WP-06) were bare thumbnails: they could not be enlarged, browsed with the keyboard or by swipe, shared, or indexed, and the owner had only two layouts.

## What shipped

- **Lightbox.** `src/components/business-gallery.tsx` renders each photo as a link to the picture, so the gallery works without JavaScript. With scripts, a click opens a native modal `<dialog>`: arrow keys, Home/End, Escape, swipe, previous/next buttons, a live "Photo 2 of 8" counter, a caption from the owner's alt text, neighbour preloading, page scroll lock, and focus returned to the thumbnail on close. Backdrop click closes. Modified clicks (new tab) stay plain links. Motion respects `prefers-reduced-motion`.
- **Gallery page.** `/b/[slug]/gallery` shows every photo (up to the 12-photo allowance) with a share control, `ImageGallery` structured data (real businesses only), a canonical URL, a redirect after an approved slug change, and `noindex` for demonstration businesses. A business with no photos has no page (404). Real published businesses with photos are listed in the sitemap.
- **Website section.** Previews six photos and links to the page ("See all N photos"). Photos without alt text are named by position ("Photo 3 of 8") so none is announced as an unlabelled image.
- **Layouts.** Two new owner-selectable layouts beside _Even grid_ and _Featured first image_: _Mosaic_ (wide and tall tiles) and _Scrolling strip_ (scroll-snap row). The strip is shown as a mosaic on the gallery page, where a horizontal scroller is a poor way to browse everything. The layout enum is widened additively; stored `grid`/`feature` values are unchanged.
- **Language.** English and Welsh strings (`site.gallery.*`, `gallery.page.*`, `design.layout.gallery.*`). The owner's alt text is marked `en-GB` on Welsh pages. Welsh is first-draft and needs review by a fluent speaker.

## Not changed

No migration, no authorisation logic, no change to the public projection. Gallery data comes from `listBusinessMedia`, which already returns only active public media.

## Tests

`gallery-model.test.ts` (preview cap, anchors, labels, wrapping, swipe), `structured-data.test.ts` (ImageGallery), `tests/integration/gallery-sitemap.test.ts` (real Postgres: demo, suspended, removed-only and hero-only businesses are excluded), `tests/e2e/business-gallery.spec.ts` (preview and link, keyboard stepping and focus return, close and backdrop, mobile reflow, Welsh, not-found, axe scan).

## Next

Separate caption field, crop tool, drag-reorder on the photos studio, Welsh review.
