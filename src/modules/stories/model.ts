import { z } from "zod";

export const storyStatuses = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;
export type StoryStatus = (typeof storyStatuses)[number];

export const STORY_TITLE_MAX = 140;
export const STORY_SUMMARY_MAX = 300;
export const STORY_BODY_MAX = 8000;
export const STORY_BODY_MIN = 80;

/** Addresses under `/news` that already mean something else. */
export const RESERVED_STORY_SLUGS: readonly string[] = ["archive", "feed"];

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens.",
  )
  .min(2)
  .max(120)
  .refine((slug) => !RESERVED_STORY_SLUGS.includes(slug), {
    message: "This web address is reserved. Choose another.",
  });

/** Suggests a web address from a headline: lowercase, accents removed. */
export function slugFromTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const storyFieldsSchema = z.object({
  title: z.string().trim().min(4).max(STORY_TITLE_MAX),
  slug: slugSchema,
  summary: z.string().trim().min(10).max(STORY_SUMMARY_MAX),
  body: z.string().trim().min(STORY_BODY_MIN).max(STORY_BODY_MAX),
  titleCy: z.string().trim().max(STORY_TITLE_MAX).default(""),
  summaryCy: z.string().trim().max(STORY_SUMMARY_MAX).default(""),
  bodyCy: z.string().trim().max(STORY_BODY_MAX).default(""),
  authorName: z.string().trim().min(2).max(120),
  placeId: z.uuid().nullable().default(null),
  sponsorshipDisclosure: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type StoryFields = z.output<typeof storyFieldsSchema>;

/** A scheduled story must be at least this far ahead, so the job can pick it up. */
export const STORY_SCHEDULE_MIN_LEAD_MS = 5 * 60_000;
/** ...and no further than this, so a forgotten schedule cannot lie dormant for years. */
export const STORY_SCHEDULE_MAX_LEAD_MS = 180 * 86_400_000;

export type ScheduleTimeCheck =
  | { ok: true; at: Date }
  | { ok: false; reason: "invalid" | "too_soon" | "too_far" };

/** Checks the time an admin chose for a story to go live. */
export function checkStorySchedule(
  value: unknown,
  now: Date = new Date(),
): ScheduleTimeCheck {
  const parsed = z.iso.datetime().safeParse(value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const at = new Date(parsed.data);
  if (Number.isNaN(at.getTime())) return { ok: false, reason: "invalid" };
  const lead = at.getTime() - now.getTime();
  if (lead < STORY_SCHEDULE_MIN_LEAD_MS) {
    return { ok: false, reason: "too_soon" };
  }
  if (lead > STORY_SCHEDULE_MAX_LEAD_MS) {
    return { ok: false, reason: "too_far" };
  }
  return { ok: true, at };
}

export const scheduleStoryInputSchema = z.object({
  id: z.uuid(),
  scheduledFor: z.string(),
  /** The `updatedAt` the editor loaded, so the checked text is the scheduled text. */
  expectedUpdatedAt: z.iso.datetime(),
});

export const STORY_IMAGE_ALT_MIN = 3;
export const STORY_IMAGE_ALT_MAX = 300;

export const createStoryInputSchema = storyFieldsSchema;
export const updateStoryInputSchema = storyFieldsSchema.extend({
  id: z.uuid(),
  /** The `updatedAt` the editor loaded; a newer save by someone else is refused. */
  expectedUpdatedAt: z.iso.datetime(),
});

export function describeStoryIssues(issues: readonly z.core.$ZodIssue[]) {
  const labels: Record<string, string> = {
    title: "Headline",
    slug: "Web address",
    summary: "Summary",
    body: "Story text",
    titleCy: "Welsh headline",
    summaryCy: "Welsh summary",
    bodyCy: "Welsh story text",
    authorName: "Author",
    placeId: "Place",
    sponsorshipDisclosure: "Sponsorship note",
  };
  return issues.map((issue) => {
    const key = String(issue.path[0] ?? "");
    const label = labels[key] ?? "Story";
    if (issue.code === "too_small") return `${label} is too short.`;
    if (issue.code === "too_big") return `${label} is too long.`;
    return `${label}: ${issue.message}`;
  });
}

export type StoryBlock =
  { kind: "paragraph"; text: string } | { kind: "heading"; text: string };

/**
 * Turns the plain-text body into blocks. Blank lines separate paragraphs and a
 * line starting `## ` is a sub-heading. Nothing is ever interpreted as markup,
 * so the page renders text only.
 */
export function parseStoryBody(body: string): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  for (const chunk of body.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length > 0) {
        blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
        paragraph = [];
      }
    };
    for (const line of lines) {
      if (line.startsWith("## ") && line.slice(3).trim().length > 0) {
        flush();
        blocks.push({ kind: "heading", text: line.slice(3).trim() });
      } else {
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(countWords(body) / 200));
}

/** Welsh readers see the Welsh version only when all three parts exist. */
export function isWelshComplete(story: {
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
}): boolean {
  return (
    story.titleCy.trim().length >= 4 &&
    story.summaryCy.trim().length >= 10 &&
    story.bodyCy.trim().length >= STORY_BODY_MIN &&
    parseStoryBody(story.bodyCy).filter((block) => block.kind === "paragraph")
      .length >= 2
  );
}

/** Some Welsh text has been written but the version is not complete. */
export function isWelshPartial(story: {
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
}): boolean {
  const any = [story.titleCy, story.summaryCy, story.bodyCy].some(
    (value) => value.trim().length > 0,
  );
  return any && !isWelshComplete(story);
}

export type StoryCheck = { id: string; label: string; ok: boolean };

/** Guidance for the studio checklist; the publish rule is `canPublishStory`. */
export function assessStory(story: {
  title: string;
  summary: string;
  body: string;
  placeId: string | null;
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
}): { checks: StoryCheck[]; canPublish: boolean } {
  const blocks = parseStoryBody(story.body);
  const paragraphs = blocks.filter((block) => block.kind === "paragraph");
  const checks: StoryCheck[] = [
    {
      id: "length",
      label: "At least two paragraphs of text",
      ok: paragraphs.length >= 2,
    },
    {
      id: "summary",
      label: "A summary of at least 10 characters that is not the headline",
      ok:
        story.summary.trim().length >= 10 &&
        story.summary.trim().toLowerCase() !== story.title.trim().toLowerCase(),
    },
    {
      id: "place",
      label: "Linked to a place so people nearby find it",
      ok: story.placeId !== null,
    },
    {
      id: "welsh",
      label: "A complete Welsh version for Welsh readers",
      ok: isWelshComplete(story),
    },
  ];
  // Only the first two are blocking. A place and Welsh are recommended.
  return {
    checks,
    canPublish: Boolean(checks[0]?.ok && checks[1]?.ok),
  };
}

export type StoryLocale = "en" | "cy";

export type JsonLdStory = {
  title: string;
  summary: string;
  slug: string;
  authorName: string;
  publishedAt: Date | null;
  updatedAt: Date;
};

/** `NewsArticle` structured data, built only from public story fields. */
export function buildStoryJsonLd(
  story: JsonLdStory,
  origin: string,
  inLanguage: string,
): Record<string, unknown> {
  const url = new URL(`/news/${story.slug}`, origin).toString();
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.title,
    description: story.summary,
    inLanguage,
    mainEntityOfPage: url,
    url,
    ...(story.publishedAt
      ? { datePublished: story.publishedAt.toISOString() }
      : {}),
    dateModified: story.updatedAt.toISOString(),
    author: { "@type": "Person", name: story.authorName },
    publisher: { "@type": "Organization", name: "OurValleys" },
  };
}

export const STORY_ARCHIVE_PAGE_SIZE = 12;

export type StoryArchiveQuery = { page: number; placeSlug: string | null };

/**
 * Reads the archive's `page` and `place` parameters. Anything unexpected falls
 * back to the first page and no filter, so a mangled link still shows stories.
 */
export function parseStoryArchiveQuery(raw: {
  page?: string | string[];
  place?: string | string[];
}): StoryArchiveQuery {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  const pageText = first(raw.page);
  const page = /^\d{1,4}$/.test(pageText) ? Number(pageText) : 1;
  const placeText = first(raw.place).toLowerCase();
  const placeSlug =
    placeText.length <= 120 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(placeText)
      ? placeText
      : null;
  return { page: Math.max(page, 1), placeSlug };
}

/** Groups newest-first stories under the year they went live (UK time). */
export function groupStoriesByYear<T extends { publishedAt: Date | null }>(
  stories: readonly T[],
): Array<{ year: string; stories: T[] }> {
  const groups: Array<{ year: string; stories: T[] }> = [];
  const yearFormat = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    timeZone: "Europe/London",
  });
  for (const story of stories) {
    const year = story.publishedAt ? yearFormat.format(story.publishedAt) : "";
    const last = groups.at(-1);
    if (last && last.year === year) last.stories.push(story);
    else groups.push({ year, stories: [story] });
  }
  return groups;
}
