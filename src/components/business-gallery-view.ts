import type { Translator } from "@/lib/i18n/translate";
import {
  galleryPhotoLabel,
  type GalleryPhotoShape,
} from "@/modules/businesses/gallery-model";
import type {
  GalleryLabels,
  GalleryLayoutKey,
  GalleryPhotoView,
} from "./business-gallery";

/** Narrows a stored layout string; anything unknown renders as the even grid. */
export function galleryLayoutKey(layout: string | undefined): GalleryLayoutKey {
  return layout === "feature" || layout === "mosaic" || layout === "strip"
    ? layout
    : "grid";
}

/**
 * Plain, serialisable photo views for the client gallery. `total` is the size
 * of the whole gallery so a preview still names photos "2 of 9".
 */
export function galleryViews(
  photos: ReadonlyArray<GalleryPhotoShape>,
  total: number,
  t: Translator,
): GalleryPhotoView[] {
  return photos.map((photo, index) => ({
    id: photo.id,
    url: photo.url,
    label: galleryPhotoLabel(photo.altText, index, total, (position, count) =>
      t("site.gallery.fallbackLabel", { position, total: count }),
    ),
    focalX: photo.focalX,
    focalY: photo.focalY,
  }));
}

export function galleryLabels(t: Translator): GalleryLabels {
  return {
    open: t("site.gallery.open"),
    dialog: t("site.gallery.dialog"),
    close: t("site.gallery.close"),
    previous: t("site.gallery.previous"),
    next: t("site.gallery.next"),
    counter: t("site.gallery.counter"),
  };
}
