import "server-only";
import { and, desc, eq, lt, ne } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { guide, guideTranslation } from "@/lib/database/schema/guides";
import type { Locale } from "@/lib/i18n/config";
import { relatedGuides } from "./guide-model";
import { parseStoredSections } from "./shared";
import type { GuideSection } from "./shared";
import { applyWelshGuide, parseStoredWelsh } from "./welsh";

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
  placeId: string | null;
  place: { slug: string; name: string } | null;
  publishedAt: Date | null;
  updatedAt: Date;
  /** The language the guide text is in; "cy" only when a complete Welsh version was used. */
  contentLocale: "en" | "cy";
};

const welshJoin = () =>
  and(
    eq(guideTranslation.guideId, guide.id),
    eq(guideTranslation.locale, "cy"),
  );

const welshColumns = {
  welshTitle: guideTranslation.title,
  welshSummary: guideTranslation.summary,
  welshAreaLabel: guideTranslation.areaLabel,
  welshReadingTime: guideTranslation.readingTime,
  welshDisclosure: guideTranslation.sponsorshipDisclosure,
  welshSections: guideTranslation.sections,
};

type WelshRow = {
  welshTitle: string | null;
  welshSummary: string | null;
  welshAreaLabel: string | null;
  welshReadingTime: string | null;
  welshDisclosure: string | null;
  welshSections: unknown;
};

const publicGuideColumns = {
  slug: guide.slug,
  title: guide.title,
  summary: guide.summary,
  areaLabel: guide.areaLabel,
  readingTime: guide.readingTime,
  authorName: guide.authorName,
  sponsorshipDisclosure: guide.sponsorshipDisclosure,
  sections: guide.sections,
  placeId: guide.placeId,
  placeSlug: place.slug,
  placeName: place.canonicalName,
  publishedAt: guide.publishedAt,
  updatedAt: guide.updatedAt,
  ...welshColumns,
};

function toPublicGuide(
  row: WelshRow & {
    slug: string;
    title: string;
    summary: string;
    areaLabel: string;
    readingTime: string;
    authorName: string;
    sponsorshipDisclosure: string | null;
    sections: unknown;
    placeId: string | null;
    placeSlug: string | null;
    placeName: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  },
  locale: Locale = "en",
): PublicGuide {
  const english = {
    title: row.title,
    summary: row.summary,
    areaLabel: row.areaLabel,
    readingTime: row.readingTime,
    sponsorshipDisclosure: row.sponsorshipDisclosure,
    sections: parseStoredSections(row.sections),
  };
  const welsh =
    locale === "cy" && row.welshTitle !== null
      ? applyWelshGuide(
          english,
          parseStoredWelsh({
            title: row.welshTitle,
            summary: row.welshSummary ?? "",
            areaLabel: row.welshAreaLabel ?? "",
            readingTime: row.welshReadingTime ?? "",
            sponsorshipDisclosure: row.welshDisclosure ?? "",
            sections: row.welshSections,
          }),
        )
      : null;
  const text = welsh ?? english;
  return {
    slug: row.slug,
    title: text.title,
    summary: text.summary,
    area: welsh ? welsh.areaLabel : english.areaLabel,
    readingTime: text.readingTime,
    authorName: row.authorName,
    sponsorshipDisclosure: text.sponsorshipDisclosure,
    sections: text.sections,
    contentLocale: welsh ? "cy" : "en",
    placeId: row.placeId,
    place:
      row.placeSlug && row.placeName
        ? { slug: row.placeSlug, name: row.placeName }
        : null,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

export type ListPublicGuidesResult =
  | { state: "ready"; guides: PublicGuide[] }
  | { state: "unavailable"; guides: [] };

export async function listPublicGuides(
  locale: Locale = "en",
): Promise<ListPublicGuidesResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select(publicGuideColumns)
      .from(guide)
      .leftJoin(
        place,
        and(eq(place.id, guide.placeId), eq(place.status, "active")),
      )
      .leftJoin(guideTranslation, welshJoin())
      .where(eq(guide.status, "published"))
      .orderBy(desc(guide.publishedAt));
    return {
      state: "ready",
      guides: rows.map((row) => toPublicGuide(row, locale)),
    };
  } catch {
    return { state: "unavailable", guides: [] };
  }
}

export type RelatedGuideCard = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
  placeId: string | null;
  /** The language the card text is in. */
  contentLocale: "en" | "cy";
};

/**
 * The few guides worth reading after `current`, ranked by place then area.
 * Reads card fields only, never the section text, so an article view does not
 * pull the whole catalogue.
 */
export async function listRelatedGuideCards(
  current: { slug: string; area: string; placeId: string | null },
  limit = 3,
  locale: Locale = "en",
): Promise<RelatedGuideCard[]> {
  try {
    const database = getDatabase();
    if (locale !== "cy") {
      const rows = await database
        .select({
          slug: guide.slug,
          title: guide.title,
          summary: guide.summary,
          area: guide.areaLabel,
          readingTime: guide.readingTime,
          placeId: guide.placeId,
        })
        .from(guide)
        .where(and(eq(guide.status, "published"), ne(guide.slug, current.slug)))
        .orderBy(desc(guide.publishedAt))
        .limit(200);
      return relatedGuides(
        current,
        rows.map((row) => ({ ...row, contentLocale: "en" as const })),
        limit,
      );
    }
    // Welsh readers need the sections too, to know whether a Welsh version is
    // complete, so the candidate list is kept short for them.
    const rows = await database
      .select({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        areaLabel: guide.areaLabel,
        readingTime: guide.readingTime,
        placeId: guide.placeId,
        sponsorshipDisclosure: guide.sponsorshipDisclosure,
        sections: guide.sections,
        ...welshColumns,
      })
      .from(guide)
      .leftJoin(guideTranslation, welshJoin())
      .where(and(eq(guide.status, "published"), ne(guide.slug, current.slug)))
      .orderBy(desc(guide.publishedAt))
      .limit(60);
    const cards = rows.map((row) => {
      const card = toPublicGuide(
        {
          ...row,
          authorName: "",
          placeSlug: null,
          placeName: null,
          publishedAt: null,
          updatedAt: new Date(0),
        },
        locale,
      );
      return {
        slug: card.slug,
        title: card.title,
        summary: card.summary,
        area: card.area,
        readingTime: card.readingTime,
        placeId: card.placeId,
        contentLocale: card.contentLocale,
      };
    });
    return relatedGuides(current, cards, limit);
  } catch {
    return [];
  }
}

export type ListPublicGuidesForPlaceResult =
  | { state: "ready"; guides: PublicGuide[] }
  | { state: "unavailable"; guides: [] };

/** Published guides linked to a specific place, most recently published first. */
export async function listPublicGuidesForPlace(
  placeId: string,
  limit = 3,
  locale: Locale = "en",
): Promise<ListPublicGuidesForPlaceResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select(publicGuideColumns)
      .from(guide)
      .leftJoin(
        place,
        and(eq(place.id, guide.placeId), eq(place.status, "active")),
      )
      .leftJoin(guideTranslation, welshJoin())
      .where(and(eq(guide.placeId, placeId), eq(guide.status, "published")))
      .orderBy(desc(guide.publishedAt))
      .limit(limit);
    return {
      state: "ready",
      guides: rows.map((row) => toPublicGuide(row, locale)),
    };
  } catch {
    return { state: "unavailable", guides: [] };
  }
}

export async function getPublicGuideBySlug(
  slug: string,
  locale: Locale = "en",
): Promise<PublicGuide | null> {
  if (!slug) return null;

  try {
    const database = getDatabase();
    const [row] = await database
      .select(publicGuideColumns)
      .from(guide)
      .leftJoin(
        place,
        and(eq(place.id, guide.placeId), eq(place.status, "active")),
      )
      .leftJoin(guideTranslation, welshJoin())
      .where(and(eq(guide.slug, slug), eq(guide.status, "published")))
      .limit(1);
    return row ? toPublicGuide(row, locale) : null;
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
