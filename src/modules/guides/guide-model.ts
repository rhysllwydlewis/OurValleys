import { foldText } from "@/modules/search/match";
import { isInternalGuidePath, type GuideSection } from "./shared";

/**
 * Pure rules for guides, shared by the studio, the public article and the
 * tests: how a section is anchored and split into paragraphs, the reading time
 * suggestion, the checks that gate publishing, the readable messages for a
 * refused save, and which guides to suggest next. No database or framework
 * imports.
 */

export function sectionAnchor(section: { id: string; heading: string }) {
  const slug = foldText(section.heading)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug ? `part-${section.id}-${slug}` : `part-${section.id}`;
}

/** A blank line starts a new paragraph; single line breaks stay within one. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function guideWordCount(input: {
  summary: string;
  sections: readonly Pick<GuideSection, "heading" | "body">[];
}): number {
  return (
    countWords(input.summary) +
    input.sections.reduce(
      (total, section) =>
        total + countWords(section.heading) + countWords(section.body),
      0,
    )
  );
}

/** At an easy 200 words a minute, never less than one minute. */
export function estimateReadingMinutes(input: {
  summary: string;
  sections: readonly Pick<GuideSection, "heading" | "body">[];
}): number {
  return Math.max(1, Math.ceil(guideWordCount(input) / 200));
}

export function readingTimeLabel(minutes: number): string {
  return `${minutes} minute read`;
}

export const readinessLimits = {
  minSections: 3,
  minSummary: 40,
  idealSummaryMax: 200,
  thinSection: 80,
} as const;

export type ReadinessKey =
  | "min_sections"
  | "summary_length"
  | "has_link"
  | "review_date"
  | "place_linked"
  | "summary_search"
  | "thin_sections"
  | "tips_only"
  | "reading_time";

export type ReadinessCheck = {
  key: ReadinessKey;
  /** A blocker stops publishing; advice only improves the guide. */
  level: "blocker" | "advice";
  ok: boolean;
  /** Section numbers (from 1) the check is about, for the reader's message. */
  sections?: number[];
};

export type ReadinessInput = {
  summary: string;
  readingTime: string;
  placeId: string | null;
  reviewDueAt: Date | string | null;
  sections: readonly Pick<GuideSection, "heading" | "body" | "href" | "kind">[];
};

function parseDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function assessGuideReadiness(
  input: ReadinessInput,
  now: Date = new Date(),
): { checks: ReadinessCheck[]; canPublish: boolean } {
  const reviewDate = parseDate(input.reviewDueAt);
  const thin = input.sections
    .map((section, index) => ({ section, number: index + 1 }))
    .filter(
      ({ section }) =>
        section.kind === "text" &&
        section.body.trim().length < readinessLimits.thinSection,
    )
    .map(({ number }) => number);
  const readingMinutes = estimateReadingMinutes(input);
  const stated = /(\d+)/.exec(input.readingTime)?.[1];
  const checks: ReadinessCheck[] = [
    {
      key: "min_sections",
      level: "blocker",
      ok: input.sections.length >= readinessLimits.minSections,
    },
    {
      key: "summary_length",
      level: "blocker",
      ok: input.summary.trim().length >= readinessLimits.minSummary,
    },
    {
      key: "has_link",
      level: "blocker",
      ok: input.sections.some((section) => isInternalGuidePath(section.href)),
    },
    {
      key: "review_date",
      level: "blocker",
      ok: reviewDate !== null && reviewDate.getTime() > now.getTime(),
    },
    { key: "place_linked", level: "advice", ok: input.placeId !== null },
    {
      key: "summary_search",
      level: "advice",
      ok: input.summary.trim().length <= readinessLimits.idealSummaryMax,
    },
    {
      key: "thin_sections",
      level: "advice",
      ok: thin.length === 0,
      sections: thin,
    },
    {
      key: "tips_only",
      level: "advice",
      ok: input.sections.some((section) => section.kind === "text"),
    },
    {
      key: "reading_time",
      level: "advice",
      ok:
        stated === undefined ||
        Math.abs(Number(stated) - readingMinutes) <=
          Math.max(1, Math.round(readingMinutes * 0.5)),
    },
  ];
  return {
    checks,
    canPublish: checks.every((check) => check.level !== "blocker" || check.ok),
  };
}

/** The fields a refused save can name, as the reader sees them. */
const fieldNames: Record<string, string> = {
  title: "Title",
  slug: "Web address",
  summary: "Summary",
  areaLabel: "Area label",
  readingTime: "Reading time",
  authorName: "Author",
  sponsorshipDisclosure: "Sponsorship disclosure",
  reviewDueAt: "Review date",
  placeId: "Linked place",
  sections: "Sections",
};

const sectionFieldMessages: Record<string, string> & { linkLabel: string } = {
  heading: "needs a heading of 2 to 120 characters",
  body: "needs text of 10 to 2000 characters",
  href: "link must be a path on this site, such as /businesses",
  linkLabel: "link needs a label of at least 2 characters",
  kind: "has an unknown type",
  id: "has an invalid identifier",
};

/**
 * Turns a refused save into sentences naming the field or the section number,
 * so the editor can say what to change instead of "check the fields".
 */
export function describeGuideIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): string[] {
  const messages = new Set<string>();
  for (const issue of issues) {
    const [first, second, third] = issue.path;
    if (first === "sections" && typeof second === "number") {
      const field = typeof third === "string" ? third : "";
      let detail = sectionFieldMessages[field] ?? "is not valid";
      if (issue.message === "link_path_missing") {
        detail = "has a link label but no link";
      } else if (issue.message === "link_label") {
        detail = sectionFieldMessages.linkLabel;
      }
      messages.add(`Section ${second + 1} ${detail}.`);
    } else if (first === "sections") {
      messages.add("Add between 1 and 12 sections.");
    } else if (typeof first === "string") {
      messages.add(`${fieldNames[first] ?? first} is not valid.`);
    } else {
      messages.add("Check the guide and try again.");
    }
  }
  return [...messages];
}

export type RelatableGuide = {
  slug: string;
  area: string;
  placeId?: string | null;
};

/**
 * Up to `limit` other guides worth reading next: the same place first, then the
 * same area, then the newest. The list is already newest first.
 */
export function relatedGuides<T extends RelatableGuide>(
  current: RelatableGuide,
  all: readonly T[],
  limit = 3,
): T[] {
  const others = all.filter((candidate) => candidate.slug !== current.slug);
  const area = foldText(current.area);
  const score = (candidate: T) =>
    (current.placeId && candidate.placeId === current.placeId ? 2 : 0) +
    (foldText(candidate.area) === area ? 1 : 0);
  return others
    .map((candidate, index) => ({ candidate, index, rank: score(candidate) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

/** A short path suggestion list for the section link box. */
export const guideLinkSuggestions = [
  "/businesses",
  "/events",
  "/offers",
  "/places",
  "/map",
  "/search",
  "/news",
] as const;

export function newSectionId(random: () => string = () => cryptoId()): string {
  return random();
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
}

/** schema.org `Article` data for a published guide. */
export function buildGuideJsonLd(
  guide: {
    slug: string;
    title: string;
    summary: string;
    authorName: string;
    publishedAt: Date | null;
    updatedAt: Date;
    sponsorshipDisclosure: string | null;
  },
  origin: string,
  inLanguage: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.summary,
    inLanguage,
    url: `${origin}/guides/${guide.slug}`,
    mainEntityOfPage: `${origin}/guides/${guide.slug}`,
    author: { "@type": "Person", name: guide.authorName },
    ...(guide.publishedAt
      ? { datePublished: guide.publishedAt.toISOString() }
      : {}),
    dateModified: guide.updatedAt.toISOString(),
  };
}
