import { z } from "zod";

/**
 * Pure model for place profiles (doc 96): validation, normalisation and the
 * language fall-back rules. No database access, so it is shared by the admin
 * editor preview, the server actions and the public place page.
 */

export const PLACE_SUMMARY_MAX = 500;
export const PLACE_ABOUT_MAX = 3000;
export const PLACE_FACT_LABEL_MAX = 60;
export const PLACE_FACT_VALUE_MAX = 240;
export const PLACE_FACTS_MAX = 8;

export const placeFactSchema = z.object({
  label: z.string().trim().min(1).max(PLACE_FACT_LABEL_MAX),
  labelCy: z.string().trim().max(PLACE_FACT_LABEL_MAX).default(""),
  value: z.string().trim().min(1).max(PLACE_FACT_VALUE_MAX),
  valueCy: z.string().trim().max(PLACE_FACT_VALUE_MAX).default(""),
});

export type PlaceFact = z.infer<typeof placeFactSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const placeProfileInputSchema = z.object({
  placeId: z.uuid(),
  welshSummary: optionalText(PLACE_SUMMARY_MAX),
  about: optionalText(PLACE_ABOUT_MAX),
  aboutCy: optionalText(PLACE_ABOUT_MAX),
  facts: z.array(placeFactSchema).max(PLACE_FACTS_MAX).default([]),
});

export type PlaceProfileInput = z.infer<typeof placeProfileInputSchema>;

/** The stored, public profile of a place. */
export type PlaceProfile = {
  welshSummary: string | null;
  about: string | null;
  aboutCy: string | null;
  facts: PlaceFact[];
};

export const EMPTY_PLACE_PROFILE: PlaceProfile = {
  welshSummary: null,
  about: null,
  aboutCy: null,
  facts: [],
};

/**
 * Reads the `facts` column defensively: stored JSON is data, so anything that
 * does not match the schema is dropped rather than trusted.
 */
export function parseStoredFacts(value: unknown): PlaceFact[] {
  if (!Array.isArray(value)) return [];
  const facts: PlaceFact[] = [];
  for (const item of value) {
    const parsed = placeFactSchema.safeParse(item);
    if (parsed.success) facts.push(parsed.data);
    if (facts.length >= PLACE_FACTS_MAX) break;
  }
  return facts;
}

export type PlaceFactView = {
  label: string;
  value: string;
  /** Language of each text as shown, so it can be marked up with `lang`. */
  labelLang: "en" | "cy";
  valueLang: "en" | "cy";
};

export type PlaceProfileView = {
  summary: string;
  summaryLang: "en" | "cy";
  /** Paragraphs of "about" text in the best available language. */
  about: string[];
  aboutLang: "en" | "cy";
  facts: PlaceFactView[];
  /** True when there is anything beyond the one-line summary to show. */
  hasProfile: boolean;
};

/** Splits plain text into paragraphs on blank lines; never produces markup. */
export function toParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Picks the copy for a reader. A Welsh reader gets Welsh text where it has
 * been written and falls back to English (marked `lang="en"`) otherwise; an
 * English reader never sees Welsh-only text swapped in.
 */
export function resolvePlaceProfile(
  editorialSummary: string,
  profile: PlaceProfile | null,
  welsh: boolean,
): PlaceProfileView {
  const stored = profile ?? EMPTY_PLACE_PROFILE;
  const useWelshSummary = welsh && Boolean(stored.welshSummary);
  const welshAbout = welsh && toParagraphs(stored.aboutCy).length > 0;
  const aboutText = welshAbout ? stored.aboutCy : stored.about;

  const facts = stored.facts.map<PlaceFactView>((fact) => {
    const welshLabel = welsh && Boolean(fact.labelCy);
    const welshValue = welsh && Boolean(fact.valueCy);
    return {
      label: welshLabel ? fact.labelCy : fact.label,
      value: welshValue ? fact.valueCy : fact.value,
      labelLang: welshLabel ? "cy" : "en",
      valueLang: welshValue ? "cy" : "en",
    };
  });

  const about = toParagraphs(aboutText);
  return {
    summary: useWelshSummary
      ? (stored.welshSummary as string)
      : editorialSummary,
    summaryLang: useWelshSummary ? "cy" : "en",
    about,
    aboutLang: welshAbout ? "cy" : "en",
    facts,
    hasProfile: about.length > 0 || facts.length > 0,
  };
}

/** How complete a profile is, for the admin editor's guidance. */
export function profileCompleteness(profile: PlaceProfile): {
  done: number;
  total: number;
  missing: string[];
} {
  const checks: Array<[string, boolean]> = [
    ["English about text", toParagraphs(profile.about).length > 0],
    ["Welsh about text", toParagraphs(profile.aboutCy).length > 0],
    ["Welsh summary", Boolean(profile.welshSummary)],
    ["At least three good-to-know facts", profile.facts.length >= 3],
    [
      "Welsh wording for every fact",
      profile.facts.length > 0 &&
        profile.facts.every((fact) => fact.labelCy && fact.valueCy),
    ],
  ];
  return {
    done: checks.filter(([, ok]) => ok).length,
    total: checks.length,
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}
