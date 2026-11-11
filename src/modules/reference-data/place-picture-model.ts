/**
 * Pure model for the editorial picture of a place (doc 98): how the words that
 * go with it are cleaned and which language a reader gets. No I/O, so the
 * admin editor, the server functions and the public components share it.
 */

export const PLACE_PICTURE_ALT_MIN = 3;
export const PLACE_PICTURE_ALT_MAX = 300;
export const PLACE_PICTURE_CREDIT_MAX = 120;

function clean(raw: unknown, max: number): string {
  return typeof raw === "string"
    ? raw.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

/** Description for screen-reader users, single-spaced and bounded. */
export function cleanPlacePictureAlt(raw: unknown): string {
  return clean(raw, PLACE_PICTURE_ALT_MAX);
}

/** Optional photographer or source line; blank becomes `null`. */
export function cleanPlacePictureCredit(raw: unknown): string | null {
  return clean(raw, PLACE_PICTURE_CREDIT_MAX) || null;
}

/** A place picture as the public site and the admin preview read it. */
export type PlacePictureView = {
  url: string;
  alt: string;
  altCy: string | null;
  credit: string | null;
};

export type ResolvedPlacePicture = {
  url: string;
  alt: string;
  /** Language of `alt`: Welsh readers get Welsh only where it was written. */
  altLang: "en-GB" | "cy";
  credit: string | null;
};

export function resolvePlacePicture(
  picture: PlacePictureView,
  welsh: boolean,
): ResolvedPlacePicture {
  const useWelsh = welsh && Boolean(picture.altCy?.trim());
  return {
    url: picture.url,
    alt: useWelsh ? (picture.altCy as string) : picture.alt,
    altLang: useWelsh ? "cy" : "en-GB",
    credit: picture.credit,
  };
}

/** Why a picture cannot be saved yet, or `null` when it can. */
export function placePictureProblem(input: {
  alt: unknown;
}): "alt_missing" | null {
  return cleanPlacePictureAlt(input.alt).length < PLACE_PICTURE_ALT_MIN
    ? "alt_missing"
    : null;
}
