import { z } from "zod";

/**
 * Approved appearance choices for the generated business website (docs/32
 * §7). Users pick from tested templates and accessible accents; they never
 * supply arbitrary styling. Every accent must keep white text readable on
 * `primary` and `strong` — enforced by the contrast unit tests.
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
    description: "Softer cream surfaces for cafés, crafts and community.",
  },
  {
    key: "bold",
    name: "Bold trade",
    description: "Confident deep-ink hero for trades and services.",
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

/**
 * The complete sections the public renderer knows how to draw, in default
 * order. Hero and contact are structural and cannot be hidden.
 */
export const businessSections = [
  { id: "about", label: "About", hideable: true },
  { id: "services", label: "Services", hideable: true },
  { id: "gallery", label: "Gallery", hideable: true },
  { id: "location", label: "Location", hideable: true },
  { id: "hours", label: "Hours", hideable: true },
] as const;

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

export const appearanceSchema = z.object({
  templateKey: z.enum(templateKeys),
  accentKey: z.enum(accentKeys),
  hiddenSections: z.array(z.enum(sectionIds)).max(businessSections.length),
  sectionOrder: z.array(z.enum(sectionIds)).max(businessSections.length),
});

export type BusinessAppearanceConfig = z.infer<typeof appearanceSchema>;

export const defaultAppearance: BusinessAppearanceConfig = {
  templateKey: "standard",
  accentKey: "valley-green",
  hiddenSections: [],
  sectionOrder: sectionIds,
};

/**
 * Normalises stored or submitted appearance data into a safe configuration:
 * unknown values fall back to the default rather than breaking the page,
 * and the section order is always a complete permutation.
 */
export function normalizeAppearance(value: unknown): BusinessAppearanceConfig {
  const parsed = appearanceSchema.safeParse(value);
  if (!parsed.success) return defaultAppearance;

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
  };
}

export function getAccent(key: string) {
  return (
    businessAccents.find((accent) => accent.key === key) ?? businessAccents[0]
  );
}

/** Visible sections in configured order — drives rendering and navigation. */
export function resolveVisibleSections(
  appearance: BusinessAppearanceConfig,
): { id: BusinessSectionId; label: string }[] {
  const hidden = new Set(appearance.hiddenSections);
  return appearance.sectionOrder
    .filter((id) => !hidden.has(id))
    .map((id) => {
      const section = businessSections.find((entry) => entry.id === id);
      return { id, label: section?.label ?? id };
    });
}

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
