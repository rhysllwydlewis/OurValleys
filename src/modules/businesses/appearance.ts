import { z } from "zod";

/**
 * Approved appearance choices for the generated business website (docs/32 §7).
 * Users pick from tested templates, accessible accents and complete-section
 * layouts; they never supply arbitrary CSS, HTML or pixel positioning.
 */
export const businessTemplates = [
  {
    key: "standard",
    name: "Fresh & clear",
    description: "Bright, balanced and readable. The recommended default.",
  },
  {
    key: "warm",
    name: "Warm welcome",
    description: "Softer editorial surfaces for hospitality and community.",
  },
  {
    key: "bold",
    name: "Bold & direct",
    description: "A confident high-contrast hero for trades and services.",
  },
] as const;

export type BusinessTemplateKey = (typeof businessTemplates)[number]["key"];

export const businessAccents = [
  {
    key: "valley-green",
    name: "Valley green",
    primary: "#1d6b52",
    strong: "#14503d",
    soft: "#e7f2ed",
  },
  {
    key: "slate-blue",
    name: "Slate blue",
    primary: "#2f5a80",
    strong: "#234563",
    soft: "#e8eff5",
  },
  {
    key: "heather",
    name: "Heather",
    primary: "#6b4177",
    strong: "#53315d",
    soft: "#f1eaf4",
  },
  {
    key: "bracken",
    name: "Autumn bracken",
    primary: "#8a4514",
    strong: "#6e370f",
    soft: "#f6ede4",
  },
] as const;

export type BusinessAccentKey = (typeof businessAccents)[number]["key"];

/** Hero and contact actions are structural. These are the configurable sections. */
export const businessSections = [
  {
    id: "about",
    label: "About",
    layouts: [
      { key: "split", name: "Split introduction" },
      { key: "stacked", name: "Stacked story" },
    ],
    defaultLayout: "split",
  },
  {
    id: "services",
    label: "Services",
    layouts: [
      { key: "cards", name: "Service cards" },
      { key: "list", name: "Compact list" },
    ],
    defaultLayout: "cards",
  },
  {
    id: "gallery",
    label: "Gallery",
    layouts: [
      { key: "grid", name: "Even grid" },
      { key: "feature", name: "Featured first image" },
    ],
    defaultLayout: "grid",
  },
  {
    id: "location",
    label: "Location",
    layouts: [
      { key: "panel", name: "Location panel" },
      { key: "statement", name: "Full-width statement" },
    ],
    defaultLayout: "panel",
  },
  {
    id: "hours",
    label: "Hours",
    layouts: [
      { key: "list", name: "Daily list" },
      { key: "compact", name: "Compact hours" },
    ],
    defaultLayout: "list",
  },
  {
    id: "contact",
    label: "Contact",
    layouts: [
      { key: "panel", name: "Contact panel" },
      { key: "buttons", name: "Simple buttons" },
    ],
    defaultLayout: "panel",
  },
  {
    id: "offers",
    label: "Offers",
    layouts: [
      { key: "cards", name: "Offer cards" },
      { key: "list", name: "Compact list" },
    ],
    defaultLayout: "cards",
  },
  {
    id: "events",
    label: "Events",
    layouts: [
      { key: "cards", name: "Event cards" },
      { key: "timeline", name: "Dated timeline" },
    ],
    defaultLayout: "cards",
  },
  {
    id: "menu",
    label: "Menu",
    layouts: [
      { key: "columns", name: "Grouped columns" },
      { key: "compact", name: "Single compact list" },
    ],
    defaultLayout: "columns",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    layouts: [
      { key: "chips", name: "Feature chips" },
      { key: "list", name: "Plain list" },
    ],
    defaultLayout: "chips",
  },
] as const;

/**
 * Sections whose content comes from the business's operations (contact
 * methods, offers, events, menu, declared attributes) rather than the profile.
 * They only appear on the public site when there is something to show.
 */
export const operationSectionIds = [
  "contact",
  "offers",
  "events",
  "menu",
  "accessibility",
] as const;

export type BusinessOperationSectionId = (typeof operationSectionIds)[number];

export type BusinessSectionId = (typeof businessSections)[number]["id"];

const templateKeys = businessTemplates.map((template) => template.key) as [
  BusinessTemplateKey,
  ...BusinessTemplateKey[],
];
const accentKeys = businessAccents.map((accent) => accent.key) as [
  BusinessAccentKey,
  ...BusinessAccentKey[],
];
const sectionIds = businessSections.map((section) => section.id) as [
  BusinessSectionId,
  ...BusinessSectionId[],
];

export const sectionLayoutsSchema = z.object({
  about: z.enum(["split", "stacked"]).default("split"),
  services: z.enum(["cards", "list"]).default("cards"),
  gallery: z.enum(["grid", "feature"]).default("grid"),
  location: z.enum(["panel", "statement"]).default("panel"),
  hours: z.enum(["list", "compact"]).default("list"),
  // Every key defaults, so a layout map that omits a section keeps that
  // section's standard layout instead of being refused.
  contact: z.enum(["panel", "buttons"]).default("panel"),
  offers: z.enum(["cards", "list"]).default("cards"),
  events: z.enum(["cards", "timeline"]).default("cards"),
  menu: z.enum(["columns", "compact"]).default("columns"),
  accessibility: z.enum(["chips", "list"]).default("chips"),
});

export type BusinessSectionLayouts = z.infer<typeof sectionLayoutsSchema>;

/** Bounds for owner-written section text (plain text only, never markup). */
export const sectionCopyLimits = { heading: 60, intro: 280 } as const;

export type SectionCopyLanguage = "en" | "cy";

export type LocalisedText = Record<SectionCopyLanguage, string>;

export type SectionCopy = { heading: LocalisedText; intro: LocalisedText };

export type BusinessSectionCopy = Partial<
  Record<BusinessSectionId, SectionCopy>
>;

/**
 * Plain text only: control characters and line breaks are removed, runs of
 * white space collapse, and the result is cut to the limit. Angle brackets are
 * allowed because the text is only ever rendered as escaped text.
 */
export function cleanSectionText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function readLocalised(value: unknown, max: number): LocalisedText {
  const source =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    en: cleanSectionText(source.en, max),
    cy: cleanSectionText(source.cy, max),
  };
}

const hasText = (text: LocalisedText) => text.en !== "" || text.cy !== "";

/**
 * Reads stored or submitted section copy into its bounded shape. Unknown
 * sections and wrong types are dropped one by one, and a section with no text
 * at all is omitted, so a damaged value never hides the rest.
 */
export function normalizeSectionCopy(value: unknown): BusinessSectionCopy {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const source = value as Record<string, unknown>;
  const result: BusinessSectionCopy = {};
  for (const id of sectionIds) {
    const entry = source[id];
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const heading = readLocalised(record.heading, sectionCopyLimits.heading);
    const intro = readLocalised(record.intro, sectionCopyLimits.intro);
    if (hasText(heading) || hasText(intro)) result[id] = { heading, intro };
  }
  return result;
}

const copyEntryPrefix = "copy.";

/**
 * Section copy is stored beside the layout choices in the existing
 * `section_layouts` text array as `copy.<section>.<heading|intro>.<en|cy>:text`
 * entries, so this release needs no migration. Layout readers (including the
 * previous release) split each entry at the first colon and look up only the
 * section ids they know, so these entries are ignored there.
 */
export function serializeSectionCopy(copy: BusinessSectionCopy): string[] {
  const entries: string[] = [];
  for (const id of sectionIds) {
    const entry = copy[id];
    if (!entry) continue;
    for (const field of ["heading", "intro"] as const) {
      for (const language of ["en", "cy"] as const) {
        const text = entry[field][language];
        if (text)
          entries.push(`${copyEntryPrefix}${id}.${field}.${language}:${text}`);
      }
    }
  }
  return entries;
}

/** Reads the `copy.` entries back out of the stored text array. */
export function parseStoredSectionCopy(value: unknown): BusinessSectionCopy {
  if (!Array.isArray(value)) return {};
  const raw: Record<string, Record<string, Record<string, string>>> = {};
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.startsWith(copyEntryPrefix)) {
      continue;
    }
    const separator = entry.indexOf(":");
    if (separator < 0) continue;
    const [id, field, language, ...extra] = entry
      .slice(copyEntryPrefix.length, separator)
      .split(".");
    if (!id || !field || !language || extra.length > 0) continue;
    if (field !== "heading" && field !== "intro") continue;
    if (language !== "en" && language !== "cy") continue;
    const section = (raw[id] ??= {});
    const fieldValues = (section[field] ??= {});
    fieldValues[language] = entry.slice(separator + 1);
  }
  return normalizeSectionCopy(raw);
}

export type SectionTextView = {
  text: string;
  /** Set only when the text is in a language other than the reader's. */
  lang?: string;
};

const htmlLanguage: Record<SectionCopyLanguage, string> = {
  en: "en-GB",
  cy: "cy",
};

/**
 * What a rendered section needs: the owner's heading and intro (or `null` for
 * the standard wording), each with a `lang` attribute value only when it
 * differs from the page language.
 */
export function sectionCopyView(
  copy: BusinessSectionCopy,
  id: BusinessSectionId,
  locale: SectionCopyLanguage,
): { heading: SectionTextView | null; intro: SectionTextView | null } {
  const resolved = resolveSectionCopy(copy, id, locale);
  const view = (value: ResolvedSectionText | null): SectionTextView | null =>
    value
      ? {
          text: value.text,
          lang: value.lang === locale ? undefined : htmlLanguage[value.lang],
        }
      : null;
  return { heading: view(resolved.heading), intro: view(resolved.intro) };
}

export type ResolvedSectionText = { text: string; lang: SectionCopyLanguage };

function pickText(
  text: LocalisedText | undefined,
  locale: SectionCopyLanguage,
): ResolvedSectionText | null {
  if (!text) return null;
  const other: SectionCopyLanguage = locale === "cy" ? "en" : "cy";
  if (text[locale]) return { text: text[locale], lang: locale };
  if (text[other]) return { text: text[other], lang: other };
  return null;
}

/**
 * The owner's heading and intro for one section in the reader's language.
 * When only the other language was written, that text is shown and reports its
 * own language so the page can mark it, rather than passing it off as the
 * reader's language. `null` means the standard wording applies.
 */
export function resolveSectionCopy(
  copy: BusinessSectionCopy,
  id: BusinessSectionId,
  locale: SectionCopyLanguage,
): { heading: ResolvedSectionText | null; intro: ResolvedSectionText | null } {
  const entry = copy[id];
  return {
    heading: pickText(entry?.heading, locale),
    intro: pickText(entry?.intro, locale),
  };
}

export const appearanceSchema = z.object({
  templateKey: z.enum(templateKeys),
  accentKey: z.enum(accentKeys),
  hiddenSections: z.array(z.enum(sectionIds)).max(businessSections.length),
  sectionOrder: z.array(z.enum(sectionIds)).max(businessSections.length),
  sectionLayouts: sectionLayoutsSchema,
  sectionCopy: z.unknown().optional().transform(normalizeSectionCopy),
});

export type BusinessAppearanceConfig = z.infer<typeof appearanceSchema>;

export const defaultSectionLayouts: BusinessSectionLayouts = {
  about: "split",
  services: "cards",
  gallery: "grid",
  location: "panel",
  hours: "list",
  contact: "panel",
  offers: "cards",
  events: "cards",
  menu: "columns",
  accessibility: "chips",
};

export const defaultAppearance: BusinessAppearanceConfig = {
  templateKey: "standard",
  accentKey: "valley-green",
  hiddenSections: [],
  sectionOrder: [...sectionIds],
  sectionLayouts: { ...defaultSectionLayouts },
  sectionCopy: {},
};

const storedAppearanceSchema = appearanceSchema
  .omit({ sectionLayouts: true, sectionCopy: true })
  .extend({
    sectionLayouts: z.unknown().optional(),
    sectionCopy: z.unknown().optional(),
  });

function parseStoredSectionLayouts(value: unknown): BusinessSectionLayouts {
  let candidate = value;
  if (Array.isArray(value)) {
    candidate = Object.fromEntries(
      value.flatMap((entry) => {
        if (typeof entry !== "string") return [];
        const separator = entry.indexOf(":");
        if (separator < 1) return [];
        return [[entry.slice(0, separator), entry.slice(separator + 1)]];
      }),
    );
  }

  if (typeof candidate !== "object" || candidate === null) {
    return { ...defaultSectionLayouts };
  }
  // Read each section on its own so one unknown value (or a section added
  // later) never discards the owner's other layout choices.
  const source = candidate as Record<string, unknown>;
  const layouts: Record<string, string> = {};
  for (const section of businessSections) {
    const choice = source[section.id];
    layouts[section.id] = section.layouts.some(
      (layout) => layout.key === choice,
    )
      ? (choice as string)
      : section.defaultLayout;
  }
  return sectionLayoutsSchema.parse(layouts);
}

/** Serialises the bounded layout map into the text-array database column. */
export function serializeSectionLayouts(
  layouts: BusinessSectionLayouts,
): string[] {
  return sectionIds.map((id) => `${id}:${layouts[id]}`);
}

/**
 * Normalises stored or submitted appearance data into a safe configuration.
 * Unknown values fall back rather than breaking a public page, duplicate order
 * entries are removed, and omitted sections are appended in canonical order.
 */
export function normalizeAppearance(value: unknown): BusinessAppearanceConfig {
  const parsed = storedAppearanceSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ...defaultAppearance,
      sectionOrder: [...defaultAppearance.sectionOrder],
      sectionLayouts: { ...defaultSectionLayouts },
      sectionCopy: {},
    };
  }

  const seen = new Set<BusinessSectionId>();
  const order: BusinessSectionId[] = [];
  for (const id of parsed.data.sectionOrder) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of sectionIds) {
    if (!seen.has(id)) order.push(id);
  }

  return {
    templateKey: parsed.data.templateKey,
    accentKey: parsed.data.accentKey,
    hiddenSections: [...new Set(parsed.data.hiddenSections)],
    sectionOrder: order,
    sectionLayouts: parseStoredSectionLayouts(parsed.data.sectionLayouts),
    sectionCopy: normalizeSectionCopy(parsed.data.sectionCopy),
  };
}

export function getAccent(key: string) {
  return (
    businessAccents.find((accent) => accent.key === key) ?? businessAccents[0]
  );
}

export function getSectionDefinition(id: BusinessSectionId) {
  return businessSections.find((section) => section.id === id)!;
}

/** Visible sections in configured order drive both rendering and navigation. */
export function resolveVisibleSections(appearance: BusinessAppearanceConfig) {
  const hidden = new Set(appearance.hiddenSections);
  return appearance.sectionOrder
    .filter((id) => !hidden.has(id))
    .map((id) => ({
      id,
      label: getSectionDefinition(id).label,
      layout: appearance.sectionLayouts[id],
    }));
}

export type BusinessCategoryVariant =
  | "hospitality"
  | "trades"
  | "wellbeing"
  | "retail"
  | "professional"
  | "community"
  | "general";

const categoryRules: Array<{
  variant: Exclude<BusinessCategoryVariant, "general">;
  terms: string[];
}> = [
  {
    variant: "hospitality",
    terms: [
      "food",
      "cafe",
      "café",
      "restaurant",
      "pub",
      "hotel",
      "takeaway",
      "hospitality",
      "bakery",
    ],
  },
  {
    variant: "trades",
    terms: [
      "trade",
      "plumb",
      "heating",
      "electric",
      "build",
      "roof",
      "repair",
      "garden",
      "construction",
    ],
  },
  {
    variant: "wellbeing",
    terms: [
      "beauty",
      "wellbeing",
      "health",
      "treatment",
      "hair",
      "fitness",
      "therapy",
    ],
  },
  {
    variant: "retail",
    terms: ["retail", "shop", "store", "florist", "fashion", "gift"],
  },
  {
    variant: "professional",
    terms: [
      "professional",
      "account",
      "legal",
      "consult",
      "design",
      "financial",
      "property",
    ],
  },
  {
    variant: "community",
    terms: [
      "community",
      "charity",
      "organisation",
      "organization",
      "venue",
      "club",
      "church",
    ],
  },
];

export function resolveCategoryVariant(
  categoryName: string,
  categorySlug = "",
): BusinessCategoryVariant {
  const haystack = `${categoryName} ${categorySlug}`.toLocaleLowerCase("en-GB");
  return (
    categoryRules.find((rule) =>
      rule.terms.some((term) => haystack.includes(term)),
    )?.variant ?? "general"
  );
}

export const categoryPresentation: Record<
  BusinessCategoryVariant,
  { eyebrow: string; placeholder: string }
> = {
  hospitality: {
    eyebrow: "A warm local welcome",
    placeholder: "A place worth discovering",
  },
  trades: {
    eyebrow: "Trusted local expertise",
    placeholder: "Practical help, clearly presented",
  },
  wellbeing: {
    eyebrow: "Care, confidence and wellbeing",
    placeholder: "A calm introduction to the business",
  },
  retail: {
    eyebrow: "Independent local retail",
    placeholder: "Products and personality from the Valleys",
  },
  professional: {
    eyebrow: "Local professional expertise",
    placeholder: "Clear advice and trusted support",
  },
  community: {
    eyebrow: "Rooted in the community",
    placeholder: "A local place to connect",
  },
  general: {
    eyebrow: "Independent local business",
    placeholder: "Built around the business, not the directory",
  },
};

/** WCAG contrast ratio used by the accessible-palette unit tests. */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map((offset) => {
      const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    const [r, g, b] = channels;
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [light, dark] = [luminance(hexA), luminance(hexB)].sort(
    (a, b) => b - a,
  );
  return (light! + 0.05) / (dark! + 0.05);
}

export type AppearanceDraftInput = {
  template?: string | null;
  accent?: string | null;
  /** Comma-separated section ids to hide. */
  hide?: string | null;
  /** Comma-separated section ids, first to last. */
  order?: string | null;
  /** Comma-separated `section:layout` pairs. */
  layouts?: string | null;
  /** JSON object of section copy, as the designer's form holds it. */
  copy?: string | null;
};

/** Longest `copy` value the preview will parse (ten sections, both languages). */
const maxDraftCopyLength = 8000;

function parseDraftCopy(
  value: string | null | undefined,
  fallback: BusinessSectionCopy,
): BusinessSectionCopy {
  if (!value || value.length > maxDraftCopyLength) return fallback;
  try {
    return normalizeSectionCopy(JSON.parse(value));
  } catch {
    return fallback;
  }
}

function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length < 40)
    .slice(0, 40);
}

/**
 * Applies unsaved designer choices to the saved appearance for a private
 * preview. Each choice is checked on its own against the approved lists and
 * anything unrecognised keeps the saved value, so a hand-edited address can
 * never produce an unapproved style or break the page.
 */
export function applyAppearanceDraft(
  base: BusinessAppearanceConfig,
  input: AppearanceDraftInput,
): BusinessAppearanceConfig {
  const templateKey =
    businessTemplates.find((template) => template.key === input.template)
      ?.key ?? base.templateKey;
  const accentKey =
    businessAccents.find((accent) => accent.key === input.accent)?.key ??
    base.accentKey;

  const knownIds = new Set<string>(sectionIds);
  const hiddenSections =
    input.hide === undefined || input.hide === null
      ? base.hiddenSections
      : splitList(input.hide).filter((id): id is BusinessSectionId =>
          knownIds.has(id),
        );
  const orderedIds = splitList(input.order).filter(
    (id): id is BusinessSectionId => knownIds.has(id),
  );
  const sectionOrder = orderedIds.length > 0 ? orderedIds : base.sectionOrder;

  const layoutChoices: Record<string, string> = { ...base.sectionLayouts };
  for (const pair of splitList(input.layouts)) {
    const separator = pair.indexOf(":");
    if (separator < 1) continue;
    layoutChoices[pair.slice(0, separator)] = pair.slice(separator + 1);
  }

  return normalizeAppearance({
    templateKey,
    accentKey,
    hiddenSections,
    sectionOrder,
    sectionLayouts: layoutChoices,
    sectionCopy: parseDraftCopy(input.copy, base.sectionCopy),
  });
}

type StartingDesign = Pick<
  BusinessAppearanceConfig,
  "templateKey" | "accentKey" | "sectionOrder"
> & { sectionLayouts: Partial<BusinessSectionLayouts> };

/**
 * Category-led starting designs for a business that has not saved its own.
 * Each puts what that kind of business is visited for first: a café's menu,
 * a tradesperson's services and contact details, a shop's pictures. Every
 * section stays available and an owner can change all of it.
 */
const startingDesigns: Record<BusinessCategoryVariant, StartingDesign> = {
  general: {
    templateKey: "standard",
    accentKey: "valley-green",
    sectionOrder: [...sectionIds],
    sectionLayouts: {},
  },
  hospitality: {
    templateKey: "warm",
    accentKey: "bracken",
    sectionOrder: [
      "about",
      "menu",
      "services",
      "gallery",
      "offers",
      "events",
      "hours",
      "location",
      "contact",
      "accessibility",
    ],
    sectionLayouts: { gallery: "feature" },
  },
  trades: {
    templateKey: "bold",
    accentKey: "slate-blue",
    sectionOrder: [
      "services",
      "about",
      "contact",
      "gallery",
      "hours",
      "location",
      "offers",
      "events",
      "accessibility",
      "menu",
    ],
    sectionLayouts: { services: "list" },
  },
  wellbeing: {
    templateKey: "warm",
    accentKey: "heather",
    sectionOrder: [
      "about",
      "services",
      "gallery",
      "hours",
      "contact",
      "location",
      "offers",
      "events",
      "accessibility",
      "menu",
    ],
    sectionLayouts: { about: "stacked" },
  },
  retail: {
    templateKey: "standard",
    accentKey: "valley-green",
    sectionOrder: [
      "gallery",
      "about",
      "offers",
      "services",
      "events",
      "hours",
      "location",
      "contact",
      "accessibility",
      "menu",
    ],
    sectionLayouts: { gallery: "feature" },
  },
  professional: {
    templateKey: "standard",
    accentKey: "slate-blue",
    sectionOrder: [
      "about",
      "services",
      "contact",
      "location",
      "hours",
      "gallery",
      "offers",
      "events",
      "accessibility",
      "menu",
    ],
    sectionLayouts: { services: "list" },
  },
  community: {
    templateKey: "warm",
    accentKey: "valley-green",
    sectionOrder: [
      "about",
      "events",
      "offers",
      "gallery",
      "hours",
      "location",
      "contact",
      "services",
      "accessibility",
      "menu",
    ],
    sectionLayouts: { events: "timeline" },
  },
};

/**
 * The appearance a business gets until its owner saves one. Unknown or missing
 * pieces fall back to the general design, and the result always passes
 * `normalizeAppearance`, so every section is present exactly once.
 */
export function defaultAppearanceForVariant(
  variant: BusinessCategoryVariant,
): BusinessAppearanceConfig {
  const design = startingDesigns[variant] ?? startingDesigns.general;
  return normalizeAppearance({
    templateKey: design.templateKey,
    accentKey: design.accentKey,
    hiddenSections: [],
    sectionOrder: design.sectionOrder,
    sectionLayouts: { ...defaultSectionLayouts, ...design.sectionLayouts },
    sectionCopy: {},
  });
}
