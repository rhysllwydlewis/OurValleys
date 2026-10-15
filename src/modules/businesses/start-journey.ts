import {
  businessAccents,
  businessTemplates,
  defaultAppearanceForVariant,
  resolveCategoryVariant,
  resolveVisibleSections,
  type BusinessAccentKey,
  type BusinessCategoryVariant,
  type BusinessSectionId,
  type BusinessTemplateKey,
} from "./appearance";

/**
 * Pure helpers for the guided "start your business" journey: name matching for
 * the live "is it already listed?" check, progress through the four steps and
 * the starter-website preview. No database or framework imports, so the same
 * code runs in the server action, the browser and the unit tests.
 */

const noiseWords = new Set([
  "the",
  "and",
  "ltd",
  "limited",
  "cyf",
  "cyfyngedig",
  "co",
  "company",
  "cwmni",
  "&",
]);

/** Lower-case, accent-free, punctuation-free form of a name used to compare. */
export function foldBusinessName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("en-GB")
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(folded: string): string[] {
  const tokens = folded.split(" ").filter(Boolean);
  const meaningful = tokens.filter((token) => !noiseWords.has(token));
  return meaningful.length > 0 ? meaningful : tokens;
}

function bigrams(value: string): string[] {
  const compact = value.replace(/\s/g, "");
  if (compact.length < 2) return compact ? [compact] : [];
  const pairs: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    pairs.push(compact.slice(index, index + 2));
  }
  return pairs;
}

function diceCoefficient(left: string, right: string): number {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.length === 0 || b.length === 0) return 0;
  const remaining = new Map<string, number>();
  for (const pair of b) remaining.set(pair, (remaining.get(pair) ?? 0) + 1);
  let shared = 0;
  for (const pair of a) {
    const count = remaining.get(pair) ?? 0;
    if (count > 0) {
      shared += 1;
      remaining.set(pair, count - 1);
    }
  }
  return (2 * shared) / (a.length + b.length);
}

/**
 * How alike two business names are, from 0 (nothing in common) to 1 (the same
 * name once case, accents, punctuation and "Ltd"-style words are ignored).
 */
export function businessNameSimilarity(left: string, right: string): number {
  const a = foldBusinessName(left);
  const b = foldBusinessName(right);
  if (!a || !b) return 0;
  const tokensA = significantTokens(a);
  const tokensB = significantTokens(b);
  if (tokensA.join(" ") === tokensB.join(" ")) return 1;

  const joinedA = tokensA.join(" ");
  const joinedB = tokensB.join(" ");
  const [shorter, longer] =
    joinedA.length <= joinedB.length ? [joinedA, joinedB] : [joinedB, joinedA];
  // One name wholly inside the other ("tiglers" in "tiglers fish and chips").
  // Very short fragments are too common to treat as a match.
  if (shorter.length >= 4 && longer.includes(shorter)) {
    return 0.8 + 0.15 * (shorter.length / longer.length);
  }

  const setB = new Set(tokensB);
  const overlap = tokensA.filter((token) => setB.has(token)).length;
  const jaccard = overlap / new Set([...tokensA, ...tokensB]).size;
  return Math.max(jaccard, diceCoefficient(joinedA, joinedB));
}

export type NameMatchKind = "exact" | "close" | "possible";

export type NameMatchCandidate = {
  id: string;
  slug: string;
  tradingName: string;
  welshName?: string | null;
  placeId?: string | null;
  placeName: string | null;
  categoryName: string | null;
};

export type RankedNameMatch = NameMatchCandidate & {
  matchKind: NameMatchKind;
  score: number;
};

/** Below this a candidate is not worth interrupting the owner for. */
export const nameMatchThreshold = 0.62;

export function nameMatchKind(score: number): NameMatchKind {
  if (score >= 0.97) return "exact";
  if (score >= 0.8) return "close";
  return "possible";
}

/**
 * Ranks published businesses that might be the one being entered. Both the
 * English and the Welsh trading name count, and a business in the same place
 * ranks above an equally similar one elsewhere because a duplicate is far
 * more likely nearby.
 */
export function rankSimilarBusinesses(
  query: string,
  candidates: readonly NameMatchCandidate[],
  options: { placeId?: string | null; limit?: number } = {},
): RankedNameMatch[] {
  const limit = options.limit ?? 5;
  const ranked: RankedNameMatch[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    const score = Math.max(
      businessNameSimilarity(query, candidate.tradingName),
      candidate.welshName
        ? businessNameSimilarity(query, candidate.welshName)
        : 0,
    );
    if (score < nameMatchThreshold) continue;
    ranked.push({ ...candidate, score, matchKind: nameMatchKind(score) });
  }
  const samePlace = (match: RankedNameMatch) =>
    options.placeId && match.placeId === options.placeId ? 1 : 0;
  ranked.sort(
    (a, b) =>
      b.score + samePlace(b) * 0.05 - (a.score + samePlace(a) * 0.05) ||
      a.tradingName.localeCompare(b.tradingName, "en-GB"),
  );
  return ranked.slice(0, limit);
}

export type StartStepId = "name" | "category" | "place" | "reach";

export type StartFormState = {
  name: string;
  categoryId: string;
  placeId: string;
  businessType: string;
};

export const startStepOrder: readonly StartStepId[] = [
  "name",
  "category",
  "place",
  "reach",
];

const businessTypes = ["premises", "service_area", "online"] as const;

export function startProgress(state: StartFormState): {
  done: Record<StartStepId, boolean>;
  completed: number;
  total: number;
  ready: boolean;
} {
  const done: Record<StartStepId, boolean> = {
    name: state.name.trim().length >= 2,
    category: state.categoryId !== "",
    place: state.placeId !== "",
    reach: (businessTypes as readonly string[]).includes(state.businessType),
  };
  const completed = startStepOrder.filter((step) => done[step]).length;
  return {
    done,
    completed,
    total: startStepOrder.length,
    ready: completed === startStepOrder.length,
  };
}

export type StarterPreview = {
  variant: BusinessCategoryVariant;
  templateKey: BusinessTemplateKey;
  templateName: string;
  accentKey: BusinessAccentKey;
  accent: { primary: string; strong: string; soft: string };
  /** The first sections the generated website opens with, in order. */
  sections: BusinessSectionId[];
};

const previewSectionCount = 6;

/**
 * What the generated website will start as for a category: the template,
 * accent and section order the business gets before it saves its own. This
 * is the same design the live site applies, so the preview never promises
 * more than the owner receives.
 */
export function starterPreview(
  categoryName: string,
  categorySlug: string,
  businessType: string,
): StarterPreview {
  const variant = resolveCategoryVariant(categoryName, categorySlug);
  const appearance = defaultAppearanceForVariant(variant);
  const template =
    businessTemplates.find((option) => option.key === appearance.templateKey) ??
    businessTemplates[0];
  const accent =
    businessAccents.find((option) => option.key === appearance.accentKey) ??
    businessAccents[0];
  const sections = resolveVisibleSections(appearance)
    .map((section) => section.id)
    // A business without a menu or premises does not open with that section.
    .filter((id) => !(id === "location" && businessType === "online"))
    .slice(0, previewSectionCount);
  return {
    variant,
    templateKey: template.key,
    templateName: template.name,
    accentKey: accent.key,
    accent: {
      primary: accent.primary,
      strong: accent.strong,
      soft: accent.soft,
    },
    sections,
  };
}

/** One or two capital letters for the preview badge. */
export function previewInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word && !noiseWords.has(foldBusinessName(word)));
  const letters = words
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase("en-GB") ?? "");
  return letters.join("") || "OV";
}
