/**
 * Pure model for a guide's own editorial picture (doc 118): how the words that
 * go with it are cleaned, which language a reader gets, and which picture a
 * card shows when a guide has none of its own. No I/O, so the admin studio,
 * the server functions and the public components share it.
 */

export const GUIDE_PICTURE_ALT_MIN = 3;
export const GUIDE_PICTURE_ALT_MAX = 300;
export const GUIDE_PICTURE_CREDIT_MAX = 120;
export const GUIDE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

function clean(raw: unknown, max: number): string {
  return typeof raw === "string"
    ? raw.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

/** Description for screen-reader users, single-spaced and bounded. */
export function cleanGuidePictureAlt(raw: unknown): string {
  return clean(raw, GUIDE_PICTURE_ALT_MAX);
}

/** Optional photographer or source line; blank becomes `null`. */
export function cleanGuidePictureCredit(raw: unknown): string | null {
  return clean(raw, GUIDE_PICTURE_CREDIT_MAX) || null;
}

/** A guide picture as the public site and the admin preview read it. */
export type GuidePictureView = {
  url: string;
  alt: string;
  altCy: string | null;
  credit: string | null;
};

export type ResolvedGuidePicture = {
  url: string;
  alt: string;
  /** Language of `alt`: Welsh readers get Welsh only where it was written. */
  altLang: "en-GB" | "cy";
  credit: string | null;
};

export function resolveGuidePicture(
  picture: GuidePictureView,
  welsh: boolean,
): ResolvedGuidePicture {
  const useWelsh = welsh && Boolean(picture.altCy?.trim());
  return {
    url: picture.url,
    alt: useWelsh ? (picture.altCy as string) : picture.alt,
    altLang: useWelsh ? "cy" : "en-GB",
    credit: picture.credit,
  };
}

/** Why a picture cannot be saved yet, or `null` when it can. */
export function guidePictureProblem(input: {
  alt: unknown;
}): "alt_missing" | null {
  return cleanGuidePictureAlt(input.alt).length < GUIDE_PICTURE_ALT_MIN
    ? "alt_missing"
    : null;
}

/**
 * Turns stored columns into the public view. `toUrl` is the media host lookup,
 * passed in so this stays pure; a picture with no description or no reachable
 * address is treated as no picture rather than shown unlabelled.
 */
export function guidePictureFromColumns(
  row: {
    imageKey: string | null;
    imageAlt: string | null;
    imageAltCy: string | null;
    imageCredit: string | null;
  },
  toUrl: (key: string) => string | null,
): GuidePictureView | null {
  if (!row.imageKey || !row.imageAlt) return null;
  const url = toUrl(row.imageKey);
  if (!url) return null;
  return {
    url,
    alt: row.imageAlt,
    altCy: row.imageAltCy,
    credit: row.imageCredit,
  };
}

/** Stock pictures for guides that have none of their own. */
const stockPictures = {
  coffee: "/home/guide-coffee.webp",
  place: "/home/guide-place.webp",
  trails: "/home/guide-trails.webp",
} as const;

const topics: readonly [RegExp, keyof typeof stockPictures][] = [
  [/coffee|cafe|caffi|food|eat|bak|bwyd/, "coffee"],
  [/trail|walk|hik|cycl|outdoor|park|llwybr|cerdded/, "trails"],
  [/afternoon|town|village|high-street|shop|market|tref|pentref/, "place"],
];

const fallbackOrder = [
  stockPictures.place,
  stockPictures.trails,
  stockPictures.coffee,
] as const;

/**
 * The stock picture for a guide, matched to what its address says it is about
 * and falling back to position, so a walking guide never gets the café.
 */
export function stockGuidePicture(slug: string, index: number): string {
  const address = slug.toLowerCase();
  for (const [pattern, topic] of topics) {
    if (pattern.test(address)) return stockPictures[topic];
  }
  return fallbackOrder[Math.abs(index) % fallbackOrder.length]!;
}

export type GuideCardPicture = {
  src: string;
  /** True for the guide's own uploaded picture, false for a stock one. */
  own: boolean;
};

/** What a guide card shows: the guide's own picture, else the stock one. */
export function guideCardPicture(
  guide: { slug: string; picture?: GuidePictureView | null },
  index: number,
): GuideCardPicture {
  return guide.picture
    ? { src: guide.picture.url, own: true }
    : { src: stockGuidePicture(guide.slug, index), own: false };
}
