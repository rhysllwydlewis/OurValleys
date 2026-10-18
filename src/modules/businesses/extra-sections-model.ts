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

export type ExtraEntry = {
  title: string;
  description: string;
  meta?: string | undefined;
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
};

export const extraSectionKinds: Record<ExtraSectionType, FieldKind> = {
  faq: {
    titleLabel: "extra.field.question",
    descriptionLabel: "extra.field.answer",
    metaLabel: null,
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.faq",
    presentation: "accordion",
  },
  products: {
    titleLabel: "extra.field.productName",
    descriptionLabel: "extra.field.productDescription",
    metaLabel: "extra.field.price",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.products",
    presentation: "priceList",
  },
  treatments: {
    titleLabel: "extra.field.treatmentName",
    descriptionLabel: "extra.field.treatmentDescription",
    metaLabel: "extra.field.durationPrice",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.treatments",
    presentation: "priceList",
  },
  team: {
    titleLabel: "extra.field.personName",
    descriptionLabel: "extra.field.personBio",
    metaLabel: "extra.field.role",
    hasDescription: true,
    defaultTitleKey: "extra.defaultTitle.team",
    presentation: "people",
  },
  areas_covered: {
    titleLabel: "extra.field.area",
    descriptionLabel: "extra.field.areaNote",
    metaLabel: null,
    hasDescription: false,
    defaultTitleKey: "extra.defaultTitle.areas_covered",
    presentation: "chips",
  },
  facilities: {
    titleLabel: "extra.field.facility",
    descriptionLabel: "extra.field.facilityNote",
    metaLabel: null,
    hasDescription: false,
    defaultTitleKey: "extra.defaultTitle.facilities",
    presentation: "chips",
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
  | "entry_too_long";

export type ParsedExtraSectionForm =
  | {
      ok: true;
      section: {
        sectionType: ExtraSectionType;
        title: string;
        entries: ExtraEntry[];
        status: "active" | "hidden";
      };
    }
  | { ok: false; problem: ExtraSectionFormProblem };

type FormLike = { getAll(name: string): unknown[]; get(name: string): unknown };

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

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
  const entries: ExtraEntry[] = [];
  for (let index = 0; index < titles.length; index += 1) {
    const entryTitle = text(titles[index]).replace(/\s+/g, " ");
    const description = kind.hasDescription ? text(descriptions[index]) : "";
    const meta = kind.metaLabel ? text(metas[index]).replace(/\s+/g, " ") : "";
    if (!entryTitle && !description && !meta) continue;
    if (!entryTitle) return { ok: false, problem: "entry_title_missing" };
    if (
      entryTitle.length > titleLimit ||
      description.length > descriptionLimit ||
      meta.length > metaLimit
    ) {
      return { ok: false, problem: "entry_too_long" };
    }
    entries.push({
      title: entryTitle,
      description,
      ...(meta ? { meta } : {}),
    });
  }
  if (entries.length === 0) return { ok: false, problem: "no_entries" };
  if (entries.length > maxEntriesPerSection) {
    return { ok: false, problem: "too_many_entries" };
  }
  const status = text(form.get("status")) === "hidden" ? "hidden" : "active";
  return { ok: true, section: { sectionType, title, entries, status } };
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
