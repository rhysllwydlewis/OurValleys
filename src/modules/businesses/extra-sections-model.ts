import { moveId, type MoveDirection } from "./menu-model";

/**
 * Pure rules for the extra website sections (docs/32 §9, docs/59): what each
 * type asks the owner for, how the row editor's form is read, owner guidance
 * by business category and the shapes the public site and `FAQPage` data use.
 * No database or framework imports so every rule is unit tested.
 */

export const extraSectionTypes = [
  "faq",
  "products",
  "treatments",
  "team",
  "areas_covered",
  "facilities",
] as const;

export type ExtraSectionType = (typeof extraSectionTypes)[number];

export const entryAvailabilities = [
  "available",
  "limited",
  "made_to_order",
  "sold_out",
] as const;
export type EntryAvailability = (typeof entryAvailabilities)[number];

export function isEntryAvailability(
  value: unknown,
): value is EntryAvailability {
  return (
    typeof value === "string" &&
    (entryAvailabilities as readonly string[]).includes(value)
  );
}

export type ExtraEntry = {
  /**
   * A stable id for this entry's own page. Assigned when the section is
   * saved; entries stored before it existed have none and use
   * `derivedEntryId` until their next save.
   */
  id?: string | undefined;
  title: string;
  description: string;
  meta?: string | undefined;
  /** A picture of this entry (a `business_media` row with the `catalogue` role). */
  imageMediaId?: string | undefined;
  /** Products only: whether the item can be had right now. */
  availability?: EntryAvailability | undefined;
  /** An https page where the item can be ordered or booked, on another site. */
  url?: string | undefined;
  /** A short group name ("Cakes", "Haircuts") that the lists are grouped under. */
  category?: string | undefined;
};

export type ExtraSectionShape = {
  id: string;
  sectionType: ExtraSectionType;
  title: string;
  entries: readonly ExtraEntry[];
  status: string;
};

export const maxExtraSections = 12;
export const maxEntriesPerSection = 50;
export const titleLimit = 160;
export const descriptionLimit = 1200;
export const metaLimit = 200;
export const sectionTitleMin = 2;
export const sectionTitleLimit = 120;
export const entryUrlLimit = 300;
export const entryCategoryLimit = 60;
/** Most distinct categories one list may use; keeps the filters usable. */
export const maxCategoriesPerSection = 12;
export const entryImageAltMin = 3;
export const entryImageAltLimit = 300;
/** Pictures one section may carry; a catalogue page stays quick to load. */
export const maxPicturesPerSection = 30;

/** An https address with a host and no embedded credentials, or null. */
export function cleanEntryUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > entryUrlLimit) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** How many empty rows the editor offers beneath the saved ones. */
export const blankRowsOffered = 3;

type FieldKind = {
  /** Message keys for the three entry fields. */
  titleLabel: string;
  descriptionLabel: string;
  metaLabel: string | null;
  /** Whether the description is part of the entry (areas and facilities are names only). */
  hasDescription: boolean;
  /** Suggested public title, used as the starting value of a new section. */
  defaultTitleKey: string;
  /** Presentation on the public site. */
  presentation: "accordion" | "priceList" | "people" | "chips";
  /** Whether each entry may carry a picture (a photo, for people). */
  hasPicture: boolean;
  /** Whether each entry may carry a stock state. */
  hasAvailability: boolean;
  /** Whether each entry may link to another site to order or book. */
  hasLink: boolean;
  /** Whether each entry may be placed in a named category. */
  hasCategory: boolean;
};

export const extraSectionKinds: Record<ExtraSectionType, FieldKind> = {
  faq: {
    titleLabel: "extra.field.question",
    descriptionLabel: "extra.field.answer",
    metaLabel: null,
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.faq",
    presentation: "accordion",
    hasPicture: false,
    hasAvailability: false,
    hasLink: false,
    hasCategory: false,
  },
  products: {
    titleLabel: "extra.field.productName",
    descriptionLabel: "extra.field.productDescription",
    metaLabel: "extra.field.price",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.products",
    presentation: "priceList",
    hasPicture: true,
    hasAvailability: true,
    hasLink: true,
    hasCategory: true,
  },
  treatments: {
    titleLabel: "extra.field.treatmentName",
    descriptionLabel: "extra.field.treatmentDescription",
    metaLabel: "extra.field.durationPrice",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.treatments",
    presentation: "priceList",
    hasPicture: true,
    hasAvailability: false,
    hasLink: true,
    hasCategory: true,
  },
  team: {
    titleLabel: "extra.field.personName",
    descriptionLabel: "extra.field.personBio",
    metaLabel: "extra.field.role",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.team",
    presentation: "people",
    hasPicture: true,
    hasAvailability: false,
    hasLink: false,
    hasCategory: false,
  },
  areas_covered: {
    titleLabel: "extra.field.area",
    descriptionLabel: "extra.field.areaNote",
    metaLabel: null,
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.areas_covered",
    presentation: "chips",
    hasPicture: false,
    hasAvailability: false,
    hasLink: false,
    hasCategory: false,
  },
  facilities: {
    titleLabel: "extra.field.facility",
    descriptionLabel: "extra.field.facilityNote",
    metaLabel: null,
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.facilities",
    presentation: "chips",
    hasPicture: false,
    hasAvailability: false,
    hasLink: false,
    hasCategory: false,
  },
};

export function isExtraSectionType(value: unknown): value is ExtraSectionType {
  return (
    typeof value === "string" &&
    (extraSectionTypes as readonly string[]).includes(value)
  );
}

/* ------------------------------------------------------------------ */
/* Reading the row editor's form                                       */
/* ------------------------------------------------------------------ */

export type ExtraSectionFormProblem =
  | "type"
  | "title"
  | "no_entries"
  | "too_many_entries"
  | "entry_title_missing"
  | "entry_too_long"
  | "entry_url_invalid"
  | "too_many_categories"
  | "too_many_pictures";

export type ParsedExtraSectionForm =
  | {
      ok: true;
      section: {
        sectionType: ExtraSectionType;
        title: string;
        entries: ExtraEntry[];
        status: "active" | "hidden";
      };
      /** One per entry, in the same order; the picture fields of each row. */
      pictures: EntryPictureIntent[];
      /** Form row numbers (zero-based) of the entries, for matching uploads. */
      rows: number[];
    }
  | { ok: false; problem: ExtraSectionFormProblem; row?: number };

type FormLike = { getAll(name: string): unknown[]; get(name: string): unknown };

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

/** Stricter than `uuidPattern`: the stored schema's `z.uuid()` refuses ids without an RFC version and variant, which would hide the whole section. */
const rfcUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * What the form says about each row's picture. `keep` is the id the editor
 * rendered for the row; it is untrusted and the caller must check it against
 * the pictures the section already holds before using it.
 */
export type EntryPictureIntent = {
  keep: string | null;
  remove: boolean;
  alt: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads parallel `entryTitle` / `entryDescription` / `entryMeta` fields (one
 * per row). A row with nothing in it is the editor's spare blank row and is
 * skipped; a row with a description or detail but no name is refused rather
 * than silently dropped, so nothing the owner typed disappears.
 */
export function parseExtraSectionForm(form: FormLike): ParsedExtraSectionForm {
  const sectionType = text(form.get("sectionType"));
  if (!isExtraSectionType(sectionType)) return { ok: false, problem: "type" };
  const title = text(form.get("title")).replace(/\s+/g, " ");
  if (title.length < sectionTitleMin || title.length > sectionTitleLimit) {
    return { ok: false, problem: "title" };
  }
  const kind = extraSectionKinds[sectionType];
  const titles = form.getAll("entryTitle");
  const descriptions = form.getAll("entryDescription");
  const metas = form.getAll("entryMeta");
  const urls = form.getAll("entryUrl");
  const availabilities = form.getAll("entryAvailability");
  const keeps = form.getAll("entryImageId");
  const keys = form.getAll("entryKey");
  const categories = form.getAll("entryCategory");
  const usedKeys = new Set<string>();
  const alts = form.getAll("entryImageAlt");
  const removed = new Set(form.getAll("removeImageRow").map(text));
  const entries: ExtraEntry[] = [];
  const pictures: EntryPictureIntent[] = [];
  const rows: number[] = [];
  for (let index = 0; index < titles.length; index += 1) {
    const entryTitle = text(titles[index]).replace(/\s+/g, " ");
    const description = kind.hasDescription ? text(descriptions[index]) : "";
    // Details are read whenever a row submits them: types without a visible
    // detail field carry any stored value through as a hidden field, so
    // editing never erases content saved by the older generic editor.
    const meta = text(metas[index]).replace(/\s+/g, " ");
    const rawUrl = kind.hasLink ? text(urls[index]) : "";
    const rawAvailability = kind.hasAvailability
      ? text(availabilities[index])
      : "";
    const category = kind.hasCategory
      ? text(categories[index]).replace(/\s+/g, " ")
      : "";
    const alt = text(alts[index]).replace(/\s+/g, " ").slice(0, 400);
    const keepRaw = kind.hasPicture ? text(keeps[index]) : "";
    if (
      !entryTitle &&
      !description &&
      !meta &&
      !rawUrl &&
      (!rawAvailability || rawAvailability === "available")
    ) {
      continue;
    }
    if (!entryTitle) {
      return { ok: false, problem: "entry_title_missing", row: index + 1 };
    }
    if (
      entryTitle.length > titleLimit ||
      description.length > descriptionLimit ||
      meta.length > metaLimit ||
      category.length > entryCategoryLimit
    ) {
      return { ok: false, problem: "entry_too_long", row: index + 1 };
    }
    let url: string | undefined;
    if (rawUrl) {
      const cleaned = cleanEntryUrl(rawUrl);
      if (!cleaned)
        return { ok: false, problem: "entry_url_invalid", row: index + 1 };
      url = cleaned;
    }
    const availability = isEntryAvailability(rawAvailability)
      ? rawAvailability
      : undefined;
    // The row's id comes back from the editor so an entry keeps its page
    // address when it is renamed or reordered. It is untrusted: it only has to
    // look like an id and be unique in this section, so anything else is
    // replaced by a fresh one.
    const keyRaw = text(keys[index]).toLowerCase();
    const key =
      rfcUuidPattern.test(keyRaw) && !usedKeys.has(keyRaw)
        ? keyRaw
        : globalThis.crypto.randomUUID();
    usedKeys.add(key);
    entries.push({
      ...(hasEntryPage(sectionType) ? { id: key } : {}),
      title: entryTitle,
      description,
      ...(meta ? { meta } : {}),
      ...(url ? { url } : {}),
      ...(category ? { category } : {}),
      // "Available" is the unmarked default, so it is not stored.
      ...(availability && availability !== "available" ? { availability } : {}),
    });
    pictures.push({
      keep: uuidPattern.test(keepRaw) ? keepRaw.toLowerCase() : null,
      remove: removed.has(String(index)),
      alt,
    });
    rows.push(index);
  }
  if (entries.length === 0) return { ok: false, problem: "no_entries" };
  if (entries.length > maxEntriesPerSection) {
    return { ok: false, problem: "too_many_entries" };
  }
  if (categoryNames(entries).length > maxCategoriesPerSection) {
    return { ok: false, problem: "too_many_categories" };
  }
  const status = text(form.get("status")) === "hidden" ? "hidden" : "active";
  return {
    ok: true,
    section: { sectionType, title, entries, status },
    pictures,
    rows,
  };
}

/** The section types whose entries get a page of their own. */
export const entryPageTypes = ["products", "treatments", "team"] as const;

export function hasEntryPage(type: string): boolean {
  return (entryPageTypes as readonly string[]).includes(type);
}

/**
 * The id used for an entry stored before entries had ids: a stable hash of the
 * section, the position and the name, shaped like a v4 id. It lasts until the
 * section is next saved, which stores a real one.
 */
export function derivedEntryId(
  sectionId: string,
  index: number,
  title: string,
): string {
  // A small non-cryptographic 128-bit hash (cyrb128): the id only has to be
  // stable and well spread, and this keeps the module free of Node imports.
  const input = `${sectionId}:${index}:${title}`;
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i += 1) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1, h2, h3, h4]
    .map((n) => (n >>> 0).toString(16).padStart(8, "0"))
    .join("");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Old sections were entered as `title | description | detail` lines. The
 * stored shape is unchanged, so there is nothing to convert; this renders a
 * stored entry back to that line for anyone exporting or comparing.
 */
export function entryToLine(entry: ExtraEntry): string {
  return [entry.title, entry.description, entry.meta ?? ""]
    .join(" | ")
    .replace(/(?: \| )+$/, "");
}

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

/** Ids in their saved order after moving one a place; unchanged at either end. */
export function reorderSectionIds(
  ids: readonly string[],
  id: string,
  direction: MoveDirection,
): string[] {
  return moveId(ids, id, direction);
}

/* ------------------------------------------------------------------ */
/* Guidance                                                            */
/* ------------------------------------------------------------------ */

/** Sections worth recommending for each category variant, most useful first. */
const recommendedByVariant: Record<string, readonly ExtraSectionType[]> = {
  hospitality: ["faq", "facilities", "team"],
  trades: ["areas_covered", "faq", "products"],
  wellbeing: ["treatments", "team", "faq"],
  retail: ["products", "faq", "facilities"],
  professional: ["team", "faq", "areas_covered"],
  community: ["faq", "facilities", "team"],
  general: ["faq", "areas_covered", "team"],
};

export function recommendedSectionTypes(
  variant: string,
): readonly ExtraSectionType[] {
  return recommendedByVariant[variant] ?? recommendedByVariant.general!;
}

export type ExtraSectionSuggestion =
  | { code: "add_recommended"; types: ExtraSectionType[] }
  | { code: "thin_faq"; sectionId: string }
  | { code: "add_prices"; sectionId: string; count: number }
  | { code: "add_answers"; sectionId: string; count: number }
  | { code: "add_roles"; sectionId: string; count: number }
  | { code: "all_hidden" };

export type ExtraSectionGuidance = {
  sections: number;
  entries: number;
  hidden: number;
  /** Recommended types the business has not got yet (any status). */
  missingTypes: ExtraSectionType[];
  suggestions: ExtraSectionSuggestion[];
};

const thinFaqBelow = 3;

export function describeExtraSectionGuidance(
  sections: readonly ExtraSectionShape[],
  variant: string,
): ExtraSectionGuidance {
  const have = new Set(sections.map((section) => section.sectionType));
  const missingTypes = recommendedSectionTypes(variant).filter(
    (type) => !have.has(type),
  );
  const suggestions: ExtraSectionSuggestion[] = [];

  if (sections.length > 0 && sections.every((s) => s.status === "hidden")) {
    suggestions.push({ code: "all_hidden" });
  }
  for (const section of sections) {
    if (section.status !== "active") continue;
    if (section.sectionType === "faq") {
      if (section.entries.length < thinFaqBelow) {
        suggestions.push({ code: "thin_faq", sectionId: section.id });
      }
      const unanswered = section.entries.filter((e) => !e.description).length;
      if (unanswered > 0) {
        suggestions.push({
          code: "add_answers",
          sectionId: section.id,
          count: unanswered,
        });
      }
    }
    if (
      section.sectionType === "products" ||
      section.sectionType === "treatments"
    ) {
      const unpriced = section.entries.filter((e) => !e.meta).length;
      if (unpriced > 0) {
        suggestions.push({
          code: "add_prices",
          sectionId: section.id,
          count: unpriced,
        });
      }
    }
    if (section.sectionType === "team") {
      const noRole = section.entries.filter((e) => !e.meta).length;
      if (noRole > 0) {
        suggestions.push({
          code: "add_roles",
          sectionId: section.id,
          count: noRole,
        });
      }
    }
  }
  if (missingTypes.length > 0) {
    suggestions.push({ code: "add_recommended", types: missingTypes });
  }
  return {
    sections: sections.length,
    entries: sections.reduce((sum, s) => sum + s.entries.length, 0),
    hidden: sections.filter((s) => s.status === "hidden").length,
    missingTypes,
    suggestions,
  };
}

/* ------------------------------------------------------------------ */
/* Public presentation                                                 */
/* ------------------------------------------------------------------ */

/** Stable, human-meaningful anchor for a section on the public page. */
export function extraSectionAnchor(id: string): string {
  return `feature-${id}`;
}

/**
 * What visitors see: only active sections, FAQ entries without an answer are
 * left out (the owner's guidance says so, and so does `FAQPage` data), and a
 * section left with nothing to show is dropped so no empty heading or dead
 * menu link appears.
 */
export function publicExtraSections<T extends ExtraSectionShape>(
  sections: readonly T[],
): T[] {
  return sections.flatMap((section) => {
    if (section.status !== "active") return [];
    const entries =
      section.sectionType === "faq"
        ? section.entries.filter((entry) => entry.title && entry.description)
        : section.entries;
    return entries.length > 0 ? [{ ...section, entries }] : [];
  });
}

/**
 * Question and answer pairs for `FAQPage` structured data: only active FAQ
 * sections, only entries that really have an answer. Returns null when there
 * is nothing worth declaring, so no empty structured data is emitted.
 */
export function faqPairs(
  sections: readonly ExtraSectionShape[],
): Array<{ question: string; answer: string }> | null {
  const pairs = sections
    .filter((s) => s.sectionType === "faq" && s.status === "active")
    .flatMap((s) => s.entries)
    .filter((e) => e.title && e.description)
    .map((e) => ({ question: e.title, answer: e.description }));
  return pairs.length > 0 ? pairs : null;
}

/** Splits a stored "name — detail" price line into its parts for display. */
export function splitPriceMeta(meta: string | undefined): {
  price: string | null;
  note: string | null;
} {
  if (!meta) return { price: null, note: null };
  const parts = meta
    .split(/\s*[·|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { price: null, note: null };
  const priceIndex = parts.findIndex((part) =>
    /[£€$]\s?\d|\d\s?p\b/.test(part),
  );
  if (priceIndex === -1) return { price: null, note: parts.join(" · ") };
  const price = parts[priceIndex]!;
  const note = parts.filter((_, index) => index !== priceIndex).join(" · ");
  return { price, note: note || null };
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

/** Folds a category name for comparison: "Cakes", "cakes " and "CAKES" are one group. */
export function categoryKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

/**
 * The distinct category names of a list, in first-seen order. Names that differ
 * only by case or spacing are one group, shown with their first spelling.
 */
export function categoryNames(entries: readonly ExtraEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const name = entry.category?.trim();
    if (!name) continue;
    const key = categoryKey(name);
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

export type EntryGroup<E extends ExtraEntry> = {
  /** Null for entries with no category. */
  category: string | null;
  entries: E[];
};

/**
 * Splits a list into groups by category, keeping the owner's order: groups
 * appear where their first entry sits, and entries with no category come
 * last under a null heading (unless nothing is categorised, which is one
 * ungrouped list).
 */
export function groupEntriesByCategory<E extends ExtraEntry>(
  entries: readonly E[],
): Array<EntryGroup<E>> {
  const named = new Map<string, EntryGroup<E>>();
  const loose: E[] = [];
  for (const entry of entries) {
    const name = entry.category?.trim();
    if (!name) {
      loose.push(entry);
      continue;
    }
    const key = categoryKey(name);
    const group = named.get(key);
    if (group) group.entries.push(entry);
    else named.set(key, { category: name, entries: [entry] });
  }
  const groups = [...named.values()];
  if (loose.length > 0) groups.push({ category: null, entries: loose });
  return groups;
}
