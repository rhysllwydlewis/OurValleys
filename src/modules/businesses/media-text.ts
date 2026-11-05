/**
 * Pure helpers for the words an owner writes about a photo: a description for
 * screen readers (alt text) and a short visible caption, each in English and,
 * optionally, Welsh. The English text is canonical; Welsh only ever adds, and a
 * blank Welsh field falls back to the English one. No I/O.
 */

export const altTextMaxLength = 300;
export const captionMaxLength = 160;

export type PhotoTextFields = {
  altText: string;
  altTextCy: string | null;
  caption: string | null;
  captionCy: string | null;
};

export type ResolvedPhotoText = {
  /** The description a screen reader announces (may be empty for a logo). */
  alt: string;
  /** The visible caption; empty when the owner wrote none. */
  caption: string;
  /** Language of `alt`. */
  altLang: "en-GB" | "cy";
  /** Language of `caption`. */
  captionLang: "en-GB" | "cy";
};

/** Trims and bounds an optional owner-written field; blank becomes null. */
export function cleanOptionalText(
  value: string | null | undefined,
  max: number,
): string | null {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed ? trimmed : null;
}

/**
 * The text to show for one photo to a reader of `locale`. Welsh readers get the
 * Welsh description and caption where written and the owner's English
 * otherwise; each field reports the language it is actually in so the page can
 * mark it correctly.
 */
export function resolvePhotoText(
  fields: PhotoTextFields,
  locale: "en" | "cy",
): ResolvedPhotoText {
  const english = {
    alt: fields.altText.trim(),
    caption: (fields.caption ?? "").trim(),
  };
  if (locale !== "cy") {
    return {
      alt: english.alt,
      caption: english.caption,
      altLang: "en-GB",
      captionLang: "en-GB",
    };
  }
  const welshAlt = (fields.altTextCy ?? "").trim();
  const welshCaption = (fields.captionCy ?? "").trim();
  return {
    alt: welshAlt || english.alt,
    caption: welshCaption || english.caption,
    altLang: welshAlt ? "cy" : "en-GB",
    // A Welsh caption is only meaningful as itself; with none written, the
    // English caption is shown (and marked English) rather than a blank.
    captionLang: welshCaption ? "cy" : "en-GB",
  };
}

/** How much of the description and caption text an owner has covered in Welsh. */
export function welshPhotoCoverage(
  photos: ReadonlyArray<
    Pick<PhotoTextFields, "altTextCy" | "caption" | "captionCy">
  >,
): { described: number; total: number; captionsMissing: number } {
  const described = photos.filter((photo) =>
    (photo.altTextCy ?? "").trim(),
  ).length;
  const captionsMissing = photos.filter(
    (photo) => (photo.caption ?? "").trim() && !(photo.captionCy ?? "").trim(),
  ).length;
  return { described, total: photos.length, captionsMissing };
}
