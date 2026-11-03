import {
  hasEntryPage,
  splitPriceMeta,
  type ExtraEntry,
  type ExtraSectionShape,
} from "./extra-sections-model";

/**
 * Pure rules for the page of one catalogue entry (a product, a treatment or a
 * team member). No database or framework imports.
 */

const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntryId(value: string): boolean {
  return idPattern.test(value);
}

export const maxSiblingsShown = 6;

/**
 * Finds the entry in the sections a visitor can see. Hidden sections are not
 * passed in by the caller, and only the types that have entry pages match, so
 * an id of a question or a facility is simply "not found".
 */
export function findCatalogueEntry<
  S extends ExtraSectionShape & { entries: readonly ExtraEntry[] },
>(
  sections: readonly S[],
  entryId: string,
): {
  section: S;
  entry: S["entries"][number];
  /** The other entries of the same list, in the owner's order. */
  siblings: Array<S["entries"][number]>;
} | null {
  const wanted = entryId.toLowerCase();
  for (const section of sections) {
    if (!hasEntryPage(section.sectionType)) continue;
    const entry = section.entries.find((item) => item.id === wanted);
    if (!entry) continue;
    return {
      section,
      entry,
      siblings: section.entries
        .filter((item) => item !== entry)
        .slice(0, maxSiblingsShown),
    };
  }
  return null;
}

/** "£12.50" style prices that structured data may state as a number. */
export function structuredPrice(meta: string | undefined): string | null {
  const { price } = splitPriceMeta(meta);
  const match = /^£\s?(\d{1,5}(?:\.\d{2})?)$/.exec(price ?? "");
  return match ? match[1]! : null;
}

export function entryPagePath(
  slug: string,
  entryId: string,
): `/b/${string}/catalogue/${string}` {
  return `/b/${slug}/catalogue/${entryId}`;
}
