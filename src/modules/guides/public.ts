import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { parseStoredSections } from "./shared";
import type { GuideSection } from "./shared";

export type PublicGuideSection = GuideSection;

export type PublicGuide = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  sections: readonly PublicGuideSection[];
};

function toPublicGuide(row: {
  slug: string;
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  sections: unknown;
}): PublicGuide {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    area: row.areaLabel,
    readingTime: row.readingTime,
    authorName: row.authorName,
    sponsorshipDisclosure: row.sponsorshipDisclosure,
    sections: parseStoredSections(row.sections),
  };
}

export type ListPublicGuidesResult =
  | { state: "ready"; guides: PublicGuide[] }
  | { state: "unavailable"; guides: [] };

export async function listPublicGuides(): Promise<ListPublicGuidesResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        areaLabel: guide.areaLabel,
        readingTime: guide.readingTime,
        authorName: guide.authorName,
        sponsorshipDisclosure: guide.sponsorshipDisclosure,
        sections: guide.sections,
        publishedAt: guide.publishedAt,
      })
      .from(guide)
      .where(eq(guide.status, "published"))
      .orderBy(desc(guide.publishedAt));
    return { state: "ready", guides: rows.map(toPublicGuide) };
  } catch {
    return { state: "unavailable", guides: [] };
  }
}

export type ListPublicGuidesForPlaceResult =
  | { state: "ready"; guides: PublicGuide[] }
  | { state: "unavailable"; guides: [] };

/** Published guides linked to a specific place, most recently published first. */
export async function listPublicGuidesForPlace(
  placeId: string,
  limit = 3,
): Promise<ListPublicGuidesForPlaceResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        areaLabel: guide.areaLabel,
        readingTime: guide.readingTime,
        authorName: guide.authorName,
        sponsorshipDisclosure: guide.sponsorshipDisclosure,
        sections: guide.sections,
      })
      .from(guide)
      .where(and(eq(guide.placeId, placeId), eq(guide.status, "published")))
      .orderBy(desc(guide.publishedAt))
      .limit(limit);
    return { state: "ready", guides: rows.map(toPublicGuide) };
  } catch {
    return { state: "unavailable", guides: [] };
  }
}

export async function getPublicGuideBySlug(
  slug: string,
): Promise<PublicGuide | null> {
  if (!slug) return null;

  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        areaLabel: guide.areaLabel,
        readingTime: guide.readingTime,
        authorName: guide.authorName,
        sponsorshipDisclosure: guide.sponsorshipDisclosure,
        sections: guide.sections,
      })
      .from(guide)
      .where(and(eq(guide.slug, slug), eq(guide.status, "published")))
      .limit(1);
    return row ? toPublicGuide(row) : null;
  } catch {
    return null;
  }
}

/** Guides whose review date has passed but that are still published — a housekeeping signal for admins, not a public-facing state. */
export async function listOverdueGuidesForReview(): Promise<
  { id: string; title: string; reviewDueAt: Date }[]
> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: guide.id,
        title: guide.title,
        reviewDueAt: guide.reviewDueAt,
      })
      .from(guide)
      .where(
        and(eq(guide.status, "published"), lt(guide.reviewDueAt, new Date())),
      )
      .orderBy(guide.reviewDueAt);
    return rows.filter(
      (row): row is { id: string; title: string; reviewDueAt: Date } =>
        row.reviewDueAt !== null,
    );
  } catch {
    return [];
  }
}
