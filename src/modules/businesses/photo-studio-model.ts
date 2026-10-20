import type { BusinessMediaCollection } from "./media";

/**
 * Pure rules behind the photos studio (`/dashboard/business/[id]/photos`):
 * where a focal point lands in each crop, what makes a good description, and
 * how complete a business's photo set is. Nothing here reads the database.
 */

/** The shapes a photo is cropped to on the public site, widest first. */
export const cropFrames = [
  { id: "wide", ratio: [16, 7] },
  { id: "tall", ratio: [4, 5] },
  { id: "card", ratio: [4, 3] },
  { id: "square", ratio: [1, 1] },
] as const;

export type CropFrameId = (typeof cropFrames)[number]["id"];

/** Clamps to a whole percentage; anything unusable falls back to the centre. */
export function clampFocal(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** A pointer position inside a box, as a whole-percentage focal point. */
export function focalFromPointer(input: {
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  if (input.width <= 0 || input.height <= 0) return { x: 50, y: 50 };
  return {
    x: clampFocal(((input.x - input.left) / input.width) * 100),
    y: clampFocal(((input.y - input.top) / input.height) * 100),
  };
}

/** Moves a focal point by a keyboard step, staying inside 0-100. */
export function nudgeFocal(
  point: { x: number; y: number },
  dx: number,
  dy: number,
): { x: number; y: number } {
  return { x: clampFocal(point.x + dx), y: clampFocal(point.y + dy) };
}

export type AltTextHint =
  | "missing"
  | "tooShort"
  | "tooLong"
  | "startsWithImageOf"
  | "looksLikeFilename"
  | "allCaps";

export type AltTextAssessment = {
  /** `good` means no hint applies; `needs-work` means the server would refuse. */
  level: "needs-work" | "improve" | "good";
  hints: AltTextHint[];
  length: number;
};

export const altTextLimits = {
  min: 3,
  ideal: 12,
  max: 300,
  long: 140,
} as const;

/**
 * Plain-language checks on a photo description. The server only insists on
 * three characters for non-logo photos; these hints go further, because the
 * description is what a screen reader announces and what shows when the photo
 * cannot load.
 */
export function assessAltText(
  value: string,
  role: "logo" | "hero" | "gallery",
): AltTextAssessment {
  const text = value.trim();
  const hints: AltTextHint[] = [];
  if (text.length === 0) {
    // A logo may be saved without one; the studio still encourages it.
    hints.push("missing");
    return {
      level: role === "logo" ? "improve" : "needs-work",
      hints,
      length: 0,
    };
  }
  if (text.length < altTextLimits.min && role !== "logo") {
    hints.push("tooShort");
    return { level: "needs-work", hints, length: text.length };
  }
  if (text.length < altTextLimits.ideal) hints.push("tooShort");
  if (text.length > altTextLimits.long) hints.push("tooLong");
  if (
    /^(an?\s+)?(image|photo|picture|photograph|pic)\s+(of|showing)\b/i.test(
      text,
    )
  ) {
    hints.push("startsWithImageOf");
  }
  if (
    /^[\w-]+\.(jpe?g|png|webp|gif|heic)$/i.test(text) ||
    /^img[_-]?\d+/i.test(text)
  ) {
    hints.push("looksLikeFilename");
  }
  if (text.length > 8 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    hints.push("allCaps");
  }
  return {
    level: hints.length === 0 ? "good" : "improve",
    hints,
    length: text.length,
  };
}

export type PhotoChecklistId = "logo" | "cover" | "gallery" | "descriptions";

export type PhotoChecklistItem = {
  id: PhotoChecklistId;
  done: boolean;
  /** Gallery progress and description counts; unused for logo and cover. */
  have?: number;
  want?: number;
};

export type PhotoCompleteness = {
  items: PhotoChecklistItem[];
  done: number;
  total: number;
  percent: number;
};

/** The number of gallery photos worth having before the page feels finished. */
export const recommendedGallery = 3;

export function photoCompleteness(
  media: BusinessMediaCollection,
): PhotoCompleteness {
  const all = [media.logo, media.hero, ...media.gallery].filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
  // A logo may be saved blank, but only a written description counts here.
  const described = all.filter(
    (item) =>
      item.altText.trim().length > 0 &&
      assessAltText(item.altText, item.role).level !== "needs-work",
  ).length;
  const items: PhotoChecklistItem[] = [
    { id: "logo", done: media.logo !== null },
    { id: "cover", done: media.hero !== null },
    {
      id: "gallery",
      done: media.gallery.length >= recommendedGallery,
      have: media.gallery.length,
      want: recommendedGallery,
    },
    {
      id: "descriptions",
      done: all.length > 0 && described === all.length,
      have: described,
      want: all.length,
    },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    items,
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
  };
}

/** What the free allowance leaves for a gallery. */
export function galleryRoom(
  media: BusinessMediaCollection,
  galleryLimit: number,
): number {
  return Math.max(0, galleryLimit - media.gallery.length);
}

/** CSS `object-position` for a focal point, used by every preview. */
export function objectPositionFor(point: { x: number; y: number }): string {
  return `${clampFocal(point.x)}% ${clampFocal(point.y)}%`;
}
