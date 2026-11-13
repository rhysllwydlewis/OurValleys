import "server-only";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { editorialView } from "@/lib/database/schema/business-operations";
import { guide } from "@/lib/database/schema/guides";
import { localStory } from "@/lib/database/schema/local-stories";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { londonDateString } from "@/modules/businesses/opening-hours-exceptions";
import {
  EDITORIAL_DEDUPE_MINUTES,
  buildSourceRows,
  editorialKinds,
  fillDailySeries,
  normaliseEditorialSource,
  withBarPercent,
  type EditorialInsights,
  type EditorialItemRow,
  type EditorialKind,
  type EditorialKindGroup,
  type EditorialWindow,
} from "./editorial-insights-model";

const DAY_MS = 86_400_000;
/** Items listed per kind; the rest are summarised as a count. */
const ROW_LIMIT = 8;
const UNREAD_LIMIT = 5;

/** The public address of an item, or null when it is not publicly visible. */
async function resolvePublicItem(
  kind: EditorialKind,
  itemId: string,
  now: Date,
): Promise<boolean> {
  const database = getDatabase();
  if (kind === "place") {
    const [row] = await database
      .select({ id: place.id })
      .from(place)
      .where(and(eq(place.id, itemId), eq(place.status, "active")))
      .limit(1);
    return Boolean(row);
  }
  if (kind === "guide") {
    const [row] = await database
      .select({ id: guide.id })
      .from(guide)
      .where(and(eq(guide.id, itemId), eq(guide.status, "published")))
      .limit(1);
    return Boolean(row);
  }
  const [row] = await database
    .select({ id: localStory.id })
    .from(localStory)
    .where(
      and(
        eq(localStory.id, itemId),
        eq(localStory.status, "published"),
        lte(localStory.publishedAt, now),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Record one anonymous open of a public place, guide or local story. The item
 * must exist and be publicly visible, so a caller cannot invent rows for
 * drafts or unknown ids. A repeat open by the same visitor inside
 * EDITORIAL_DEDUPE_MINUTES counts once, serialised under an advisory lock so
 * two beacons arriving together cannot both count. Analytics must never break
 * a visitor's page, so failures are swallowed.
 */
export async function recordEditorialView(input: {
  kind: EditorialKind;
  itemId: string;
  source?: string;
  visitorSignal?: string | null;
  now?: Date;
}): Promise<boolean> {
  try {
    const now = input.now ?? new Date();
    const itemId = input.itemId.toLowerCase();
    if (!(await resolvePublicItem(input.kind, itemId, now))) return false;
    const source = normaliseEditorialSource(input.source);
    const visitorHash = hashVisitorSignal(input.visitorSignal);
    const database = getDatabase();
    if (!visitorHash) {
      await database
        .insert(editorialView)
        .values({ kind: input.kind, itemId, source, viewedAt: now });
      return true;
    }
    const since = new Date(now.getTime() - EDITORIAL_DEDUPE_MINUTES * 60_000);
    return await database.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`editorial:${input.kind}:${itemId}:${visitorHash}`}, 0))`,
      );
      const [recent] = await tx
        .select({ id: editorialView.id })
        .from(editorialView)
        .where(
          and(
            eq(editorialView.kind, input.kind),
            eq(editorialView.itemId, itemId),
            eq(editorialView.visitorHash, visitorHash),
            gte(editorialView.viewedAt, since),
          ),
        )
        .limit(1);
      if (recent) return false;
      await tx.insert(editorialView).values({
        kind: input.kind,
        itemId,
        source,
        visitorHash,
        viewedAt: now,
      });
      return true;
    });
  } catch {
    return false;
  }
}

type ItemInfo = { title: string; href: string | null };

async function readItemInfo(
  kind: EditorialKind,
  ids: readonly string[],
  now: Date,
): Promise<Map<string, ItemInfo>> {
  const info = new Map<string, ItemInfo>();
  if (ids.length === 0) return info;
  const database = getDatabase();
  if (kind === "place") {
    const rows = await database
      .select({
        id: place.id,
        name: place.canonicalName,
        slug: place.slug,
        status: place.status,
      })
      .from(place)
      .where(inArray(place.id, [...ids]));
    for (const row of rows) {
      info.set(row.id, {
        title: row.name,
        href: row.status === "active" ? `/places/${row.slug}` : null,
      });
    }
  } else if (kind === "guide") {
    const rows = await database
      .select({
        id: guide.id,
        title: guide.title,
        slug: guide.slug,
        status: guide.status,
      })
      .from(guide)
      .where(inArray(guide.id, [...ids]));
    for (const row of rows) {
      info.set(row.id, {
        title: row.title,
        href: row.status === "published" ? `/guides/${row.slug}` : null,
      });
    }
  } else {
    const rows = await database
      .select({
        id: localStory.id,
        title: localStory.title,
        slug: localStory.slug,
        status: localStory.status,
        publishedAt: localStory.publishedAt,
      })
      .from(localStory)
      .where(inArray(localStory.id, [...ids]));
    for (const row of rows) {
      const live =
        row.status === "published" &&
        row.publishedAt !== null &&
        row.publishedAt <= now;
      info.set(row.id, {
        title: row.title,
        href: live ? `/news/${row.slug}` : null,
      });
    }
  }
  return info;
}

async function readUnread(
  kind: EditorialKind,
  viewedIds: readonly string[],
  now: Date,
): Promise<{
  count: number;
  items: { itemId: string; title: string; href: string }[];
}> {
  const database = getDatabase();
  const exclude = viewedIds.length > 0 ? [...viewedIds] : null;
  if (kind === "guide") {
    const where = and(
      eq(guide.status, "published"),
      exclude ? notInArray(guide.id, exclude) : undefined,
    );
    const [counted, rows] = await Promise.all([
      database
        .select({ n: sql<number>`count(*)::int` })
        .from(guide)
        .where(where),
      database
        .select({ id: guide.id, title: guide.title, slug: guide.slug })
        .from(guide)
        .where(where)
        .orderBy(desc(guide.publishedAt))
        .limit(UNREAD_LIMIT),
    ]);
    return {
      count: counted[0]?.n ?? 0,
      items: rows.map((row) => ({
        itemId: row.id,
        title: row.title,
        href: `/guides/${row.slug}`,
      })),
    };
  }
  if (kind === "story") {
    const where = and(
      eq(localStory.status, "published"),
      isNotNull(localStory.publishedAt),
      lte(localStory.publishedAt, now),
      exclude ? notInArray(localStory.id, exclude) : undefined,
    );
    const [counted, rows] = await Promise.all([
      database
        .select({ n: sql<number>`count(*)::int` })
        .from(localStory)
        .where(where),
      database
        .select({
          id: localStory.id,
          title: localStory.title,
          slug: localStory.slug,
        })
        .from(localStory)
        .where(where)
        .orderBy(desc(localStory.publishedAt))
        .limit(UNREAD_LIMIT),
    ]);
    return {
      count: counted[0]?.n ?? 0,
      items: rows.map((row) => ({
        itemId: row.id,
        title: row.title,
        href: `/news/${row.slug}`,
      })),
    };
  }
  const where = and(
    eq(place.status, "active"),
    exclude ? notInArray(place.id, exclude) : undefined,
  );
  const [counted, rows] = await Promise.all([
    database
      .select({ n: sql<number>`count(*)::int` })
      .from(place)
      .where(where),
    database
      .select({ id: place.id, title: place.canonicalName, slug: place.slug })
      .from(place)
      .where(where)
      .orderBy(place.canonicalName)
      .limit(UNREAD_LIMIT),
  ]);
  return {
    count: counted[0]?.n ?? 0,
    items: rows.map((row) => ({
      itemId: row.id,
      title: row.title,
      href: `/places/${row.slug}`,
    })),
  };
}

/**
 * Views of places, guides and local stories over a rolling period, for the
 * admin insights page. Null, not zeros, when a read fails, so a fault never
 * reads as "nobody looked". Admin-only: callers sit under the `/admin` layout,
 * which enforces platform-admin access.
 */
export async function getEditorialInsights(
  windowDays: EditorialWindow,
  now: Date = new Date(),
): Promise<EditorialInsights | null> {
  const since = new Date(now.getTime() - windowDays * DAY_MS);
  try {
    const database = getDatabase();
    const inWindow = gte(editorialView.viewedAt, since);
    const london = sql<string>`to_char(${editorialView.viewedAt} at time zone 'Europe/London', 'YYYY-MM-DD')`;
    const [perItem, perKind, perDay, perSource] = await Promise.all([
      database
        .select({
          kind: editorialView.kind,
          itemId: editorialView.itemId,
          views: sql<number>`count(*)::int`,
        })
        .from(editorialView)
        .where(inWindow)
        .groupBy(editorialView.kind, editorialView.itemId),
      database
        .select({
          kind: editorialView.kind,
          views: sql<number>`count(*)::int`,
          visitors: sql<number>`count(distinct ${editorialView.visitorHash})::int`,
        })
        .from(editorialView)
        .where(inWindow)
        .groupBy(editorialView.kind),
      database
        .select({ day: london, views: sql<number>`count(*)::int` })
        .from(editorialView)
        .where(inWindow)
        .groupBy(london),
      database
        .select({
          source: editorialView.source,
          views: sql<number>`count(*)::int`,
        })
        .from(editorialView)
        .where(inWindow)
        .groupBy(editorialView.source),
    ]);

    const groups: EditorialKindGroup[] = [];
    for (const kind of editorialKinds) {
      const items = perItem
        .filter((row) => row.kind === kind)
        .sort((a, b) => b.views - a.views || a.itemId.localeCompare(b.itemId));
      const info = await readItemInfo(
        kind,
        items.slice(0, ROW_LIMIT).map((row) => row.itemId),
        now,
      );
      const listed: Omit<EditorialItemRow, "barPercent">[] = items
        .slice(0, ROW_LIMIT)
        .map((row) => ({
          itemId: row.itemId,
          title: info.get(row.itemId)?.title ?? "Removed item",
          href: info.get(row.itemId)?.href ?? null,
          views: row.views,
        }));
      const unread = await readUnread(
        kind,
        items.map((row) => row.itemId),
        now,
      );
      const totals = perKind.find((row) => row.kind === kind);
      groups.push({
        kind,
        totalViews: totals?.views ?? 0,
        uniqueVisitors: totals?.visitors ?? 0,
        rows: withBarPercent(listed),
        hiddenCount: Math.max(items.length - ROW_LIMIT, 0),
        unreadCount: unread.count,
        unread: unread.items,
      });
    }

    return {
      windowDays,
      totalViews: groups.reduce((sum, group) => sum + group.totalViews, 0),
      groups,
      daily: fillDailySeries(
        new Map(perDay.map((row) => [row.day, row.views])),
        londonDateString(now),
        windowDays,
      ),
      sources: buildSourceRows(perSource),
    };
  } catch {
    return null;
  }
}
