/**
 * Pure helpers for the public photo gallery: how many photos the website
 * section previews, the accessible label of each photo, and the anchor ids the
 * lightbox and the gallery page share. No I/O, so it is unit tested directly.
 */

/** Photos previewed on the website before "See all" leads to the gallery page. */
export const GALLERY_PREVIEW_LIMIT = 6;

export type GalleryPhotoShape = {
  id: string;
  url: string;
  altText: string;
  altTextCy?: string | null;
  caption?: string | null;
  captionCy?: string | null;
  focalX: number;
  focalY: number;
  zoom?: number;
};

export type GalleryPreview<T extends GalleryPhotoShape> = {
  shown: T[];
  hiddenCount: number;
};

/**
 * The website section shows a few photos, so a twelve-photo gallery does not
 * push the contact details down the page.
 */
export function galleryPreview<T extends GalleryPhotoShape>(
  photos: ReadonlyArray<T>,
  limit: number = GALLERY_PREVIEW_LIMIT,
): GalleryPreview<T> {
  const safeLimit = Math.max(1, Math.floor(limit));
  const shown = photos.slice(0, safeLimit);
  return { shown, hiddenCount: Math.max(0, photos.length - shown.length) };
}

/** Stable in-page anchor for a photo; falls back to an index-based one. */
export function galleryPhotoAnchor(id: string, index: number): string {
  const safe = id.replace(/[^a-zA-Z0-9-]/g, "");
  return safe ? `photo-${safe}` : `photo-${index + 1}`;
}

/**
 * The text a screen reader or the lightbox caption uses for one photo. The
 * owner's alt text wins; when none was written the photo is still named by its
 * position so it is never announced as a bare unlabelled image.
 */
export function galleryPhotoLabel(
  altText: string,
  index: number,
  total: number,
  fallback: (position: number, total: number) => string,
): string {
  const trimmed = altText.trim();
  return trimmed || fallback(index + 1, total);
}

/** Wraps an index into `[0, total)`; a gallery of 0 has no valid index. */
export function wrapGalleryIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

/** Maps a pointer swipe to a step: -1 previous, 1 next, 0 not a swipe. */
export function swipeStep(deltaX: number, deltaY: number): -1 | 0 | 1 {
  const absX = Math.abs(deltaX);
  if (absX < 48 || absX < Math.abs(deltaY) * 1.4) return 0;
  return deltaX < 0 ? 1 : -1;
}
