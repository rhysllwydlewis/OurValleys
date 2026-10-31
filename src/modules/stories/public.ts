import "server-only";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { localStory } from "@/lib/database/schema/local-stories";
import type { Locale } from "@/lib/i18n/config";
import { publicMediaUrl } from "@/lib/media-storage";
import {
  isWelshComplete,
  readingMinutes,
  STORY_ARCHIVE_PAGE_SIZE,
} from "./model";

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
  /** The story's picture, when it has one. */
  image: { url: string; alt: string } | null;
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
  imageKey: localStory.imageKey,
  imageAlt: localStory.imageAlt,
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
  imageKey: string | null;
  imageAlt: string | null;
};

function toPublicImage(row: {
  imageKey: string | null;
  imageAlt: string | null;
}): PublicStory["image"] {
  if (!row.imageKey || !row.imageAlt) return null;
  const url = publicMediaUrl(row.imageKey);
  return url ? { url, alt: row.imageAlt } : null;
}

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
    image: toPublicImage(row),
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

export type StoryArchivePage = {
  stories: PublicStory[];
  total: number;
  page: number;
  pageSize: number;
};

/** One page of the archive, newest first, optionally for a single place. */
export async function listStoryArchivePage(
  locale: Locale,
  query: { page: number; placeSlug: string | null },
  pageSize = STORY_ARCHIVE_PAGE_SIZE,
): Promise<StoryArchivePage | null> {
  try {
    const where = and(
      eq(localStory.status, "published"),
      query.placeSlug ? eq(place.slug, query.placeSlug) : undefined,
    );
    const [totalRow] = await getDatabase()
      .select({ total: count() })
      .from(localStory)
      .leftJoin(place, eq(place.id, localStory.placeId))
      .where(where);
    const total = totalRow?.total ?? 0;
    // Past the last page shows the last page rather than an empty one.
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(query.page, lastPage);
    const rows = await baseQuery()
      .where(where)
      .orderBy(desc(localStory.publishedAt), desc(localStory.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      stories: rows.map((row) => toPublicStory(row, locale)),
      total,
      page,
      pageSize,
    };
  } catch {
    return null;
  }
}

export type StoryPlaceOption = { slug: string; name: string; count: number };

/** Places that have at least one published story, for the archive filter. */
export async function listStoryPlaceOptions(): Promise<StoryPlaceOption[]> {
  try {
    const rows = await getDatabase()
      .select({
        slug: place.slug,
        name: place.canonicalName,
        count: count(),
      })
      .from(localStory)
      .innerJoin(place, eq(place.id, localStory.placeId))
      .where(eq(localStory.status, "published"))
      .groupBy(place.slug, place.canonicalName)
      .orderBy(asc(sql`lower(${place.canonicalName})`));
    return rows;
  } catch {
    return [];
  }
}

/** Published stories linked to one place, newest first. */
export async function listPublishedStoriesForPlace(
  placeId: string,
  locale: Locale,
  limit = 3,
): Promise<PublicStory[] | null> {
  try {
    const rows = await baseQuery()
      .where(
        and(
          eq(localStory.status, "published"),
          eq(localStory.placeId, placeId),
        ),
      )
      .orderBy(desc(localStory.publishedAt), desc(localStory.id))
      .limit(Math.min(Math.max(limit, 1), 12));
    return rows.map((row) => toPublicStory(row, locale));
  } catch {
    return null;
  }
}

/**
 * Stories to read next: the same place first, then the newest others. The
 * same-place stories are queried on their own so a busy site's newest stories
 * from elsewhere can never crowd them out. Fails soft with an empty list,
 * because it only decorates a story page.
 */
export async function listRelatedStories(
  story: Pick<PublicStory, "slug" | "place">,
  locale: Locale,
  limit = 3,
): Promise<PublicStory[]> {
  try {
    const samePlaceRows = story.place
      ? await baseQuery()
          .where(
            and(
              eq(localStory.status, "published"),
              eq(place.slug, story.place.slug),
              ne(localStory.slug, story.slug),
            ),
          )
          .orderBy(desc(localStory.publishedAt), desc(localStory.id))
          .limit(limit)
      : [];
    const samePlace = samePlaceRows.map((row) => toPublicStory(row, locale));
    if (samePlace.length >= limit) return samePlace;
    const others = await listPublishedStories(
      locale,
      limit + samePlace.length + 1,
      story.slug,
    );
    const seen = new Set(samePlace.map((other) => other.slug));
    const fill = (others ?? []).filter((other) => !seen.has(other.slug));
    return [...samePlace, ...fill].slice(0, limit);
  } catch {
    return [];
  }
}
