import { describe, expect, it } from "vitest";
import {
  GALLERY_PREVIEW_LIMIT,
  galleryPhotoAnchor,
  galleryPhotoLabel,
  galleryPreview,
  swipeStep,
  wrapGalleryIndex,
} from "./gallery-model";

const photo = (id: string) => ({
  id,
  url: `https://media.example.test/${id}.jpg`,
  altText: "",
  focalX: 50,
  focalY: 50,
});

describe("galleryPreview", () => {
  it("shows every photo when there are few", () => {
    const result = galleryPreview([photo("a"), photo("b")]);
    expect(result.shown).toHaveLength(2);
    expect(result.hiddenCount).toBe(0);
  });

  it("caps the preview and reports how many are left", () => {
    const photos = Array.from({ length: 12 }, (_, i) => photo(`p${i}`));
    const result = galleryPreview(photos);
    expect(result.shown).toHaveLength(GALLERY_PREVIEW_LIMIT);
    expect(result.hiddenCount).toBe(12 - GALLERY_PREVIEW_LIMIT);
  });

  it("treats a nonsense limit as one photo", () => {
    expect(galleryPreview([photo("a"), photo("b")], 0).shown).toHaveLength(1);
    expect(galleryPreview([photo("a"), photo("b")], -3).hiddenCount).toBe(1);
  });

  it("handles an empty gallery", () => {
    expect(galleryPreview([])).toEqual({ shown: [], hiddenCount: 0 });
  });
});

describe("galleryPhotoAnchor", () => {
  it("keeps safe ids and strips anything else", () => {
    expect(galleryPhotoAnchor("0b1c-22", 0)).toBe("photo-0b1c-22");
    expect(galleryPhotoAnchor('x"><script>', 0)).toBe("photo-xscript");
  });

  it("falls back to the position for an unusable id", () => {
    expect(galleryPhotoAnchor("!!!", 3)).toBe("photo-4");
  });
});

describe("galleryPhotoLabel", () => {
  const fallback = (position: number, total: number) =>
    `Photo ${position} of ${total}`;

  it("prefers the owner's alt text", () => {
    expect(galleryPhotoLabel("  Front of the shop ", 0, 5, fallback)).toBe(
      "Front of the shop",
    );
  });

  it("names a photo with no alt text by its position", () => {
    expect(galleryPhotoLabel("   ", 1, 5, fallback)).toBe("Photo 2 of 5");
  });
});

describe("wrapGalleryIndex", () => {
  it("wraps both ways", () => {
    expect(wrapGalleryIndex(5, 5)).toBe(0);
    expect(wrapGalleryIndex(-1, 5)).toBe(4);
    expect(wrapGalleryIndex(2, 5)).toBe(2);
  });

  it("is safe for an empty gallery", () => {
    expect(wrapGalleryIndex(3, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("steps on a clear horizontal swipe", () => {
    expect(swipeStep(-120, 10)).toBe(1);
    expect(swipeStep(120, -10)).toBe(-1);
  });

  it("ignores small movements and vertical scrolling", () => {
    expect(swipeStep(20, 0)).toBe(0);
    expect(swipeStep(-100, 120)).toBe(0);
  });
});
