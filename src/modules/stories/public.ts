import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { localStory } from "@/lib/database/schema/local-stories";
import type { Locale } from "@/lib/i18n/config";
import { isWelshComplete, readingMinutes } from "./model";

/** Public fields only: no author account, no draft Welsh text. */
export type PublicStory = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  place: { slug: string; name: string } | null;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
  /** "cy" only when a complete Welsh version was used. */
  contentLocale: "en" | "cy";
};

const columns = {
  slug: localStory.slug,
  title: localStory.title,
  summary: localStory.summary,
  body: localStory.body,
  titleCy: localStory.titleCy,
  summaryCy: localStory.summaryCy,
  bodyCy: localStory.bodyCy,
  authorName: localStory.authorName,
  sponsorshipDisclosure: localStory.sponsorshipDisclosure,
  placeSlug: place.slug,
  placeName: place.canonicalName,
  publishedAt: localStory.publishedAt,
  updatedAt: localStory.updatedAt,
};

type Row = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  placeSlug: string | null;
  placeName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export function toPublicStory(row: Row, locale: Locale): PublicStory {
  const welsh = locale === "cy" && isWelshComplete(row);
  const body = welsh ? row.bodyCy : row.body;
  return {
    slug: row.slug,
    title: welsh ? row.titleCy : row.title,
    summary: welsh ? row.summaryCy : row.summary,
    body,
    authorName: row.authorName,
    sponsorshipDisclosure: row.sponsorshipDisclosure,
    place:
      row.placeSlug && row.placeName
        ? { slug: row.placeSlug, name: row.placeName }
        : null,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    readingMinutes: readingMinutes(body),
    contentLocale: welsh ? "cy" : "en",
  };
}

function baseQuery() {
  return getDatabase()
    .select(columns)
    .from(localStory)
    .leftJoin(place, eq(place.id, localStory.placeId));
}

export async function listPublishedStories(
  locale: Locale,
  limit = 30,
  excludeSlug?: string,
): Promise<PublicStory[] | null> {
  try {
    const rows = await baseQuery()
      .where(
        and(
          eq(localStory.status, "published"),
          excludeSlug ? ne(localStory.slug, excludeSlug) : undefined,
        ),
      )
      .orderBy(desc(localStory.publishedAt), desc(localStory.id))
      .limit(Math.min(Math.max(limit, 1), 100));
    return rows.map((row) => toPublicStory(row, locale));
  } catch {
    return null;
  }
}

export async function getPublishedStoryBySlug(
  rawSlug: string,
  locale: Locale,
): Promise<PublicStory | null> {
  const slug = rawSlug.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  try {
    const [row] = await baseQuery()
      .where(and(eq(localStory.slug, slug), eq(localStory.status, "published")))
      .limit(1);
    return row ? toPublicStory(row, locale) : null;
  } catch {
    return null;
  }
}
