import "server-only";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { noticeMute } from "@/lib/database/schema/notice-preference";
import { notification } from "@/lib/database/schema/notification";
import {
  cleanParams,
  kindsInGroup,
  MAX_NOTIFICATIONS_PER_USER,
  NOTIFICATION_PAGE_SIZE,
  parseKind,
  READ_NOTIFICATION_RETENTION_DAYS,
  safeNotificationHref,
  type NotificationDraft,
  type NotificationGroup,
  type NotificationKind,
  type NotificationParams,
} from "./notification-model";

const DAY_MS = 24 * 60 * 60 * 1000;

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  params: NotificationParams;
  href: string | null;
  read: boolean;
  createdAt: Date;
};

/**
 * Raises an in-site notification for one person. Best effort by design: the
 * caller has already done its real job (usually sent an email), so a failure
 * here is swallowed and reported as false, as is a kind the person has
 * muted (the email, if any, is unaffected). The same dedupe key for the same
 * person is a no-op, and a person keeps at most MAX_NOTIFICATIONS_PER_USER
 * (the oldest go first).
 */
export async function raiseNotification(
  userId: string,
  draft: NotificationDraft,
  options: { strict?: boolean } = {},
): Promise<boolean> {
  try {
    const database = getDatabase();
    // A kind the person switched off on their privacy page is never raised.
    const muted = await database
      .select({ kind: noticeMute.kind })
      .from(noticeMute)
      .where(
        and(eq(noticeMute.userId, userId), eq(noticeMute.kind, draft.kind)),
      )
      .limit(1);
    if (muted.length > 0) return false;
    const inserted = await database
      .insert(notification)
      .values({
        userId,
        kind: draft.kind,
        params: cleanParams(draft.params ?? {}),
        href: safeNotificationHref(draft.href),
        dedupeKey: draft.dedupeKey ? draft.dedupeKey.slice(0, 200) : null,
      })
      .onConflictDoNothing()
      .returning({ id: notification.id });
    if (inserted.length === 0) return false;
    await trimNotifications(userId);
    return true;
  } catch (error) {
    // A scan that must not lose a notice asks to hear about the failure.
    if (options.strict) throw error;
    return false;
  }
}

async function trimNotifications(userId: string): Promise<void> {
  // One statement, so a row inserted by a concurrent producer is never
  // deleted by a stale list: keep the newest MAX rows, whatever else exists.
  await getDatabase().execute(sql`
    delete from account_notification
    where user_id = ${userId}
      and id in (
        select id from account_notification
        where user_id = ${userId}
        order by created_at desc, id desc
        offset ${MAX_NOTIFICATIONS_PER_USER}
      )`);
}

export type NotificationList =
  | {
      state: "ready";
      items: NotificationItem[];
      total: number;
      unread: number;
      page: number;
    }
  | { state: "unavailable" };

export async function listNotificationsForUser(
  userId: string,
  options: { group: NotificationGroup; page: number; unreadOnly?: boolean },
): Promise<NotificationList> {
  try {
    const database = getDatabase();
    const kinds = kindsInGroup(options.group);
    const where = and(
      eq(notification.userId, userId),
      inArray(notification.kind, kinds),
      options.unreadOnly ? isNull(notification.readAt) : undefined,
    );
    const [totals, unread, rows] = await Promise.all([
      database.select({ total: count() }).from(notification).where(where),
      countUnreadNotifications(userId),
      database
        .select()
        .from(notification)
        .where(where)
        .orderBy(desc(notification.createdAt), desc(notification.id))
        .limit(NOTIFICATION_PAGE_SIZE)
        .offset((options.page - 1) * NOTIFICATION_PAGE_SIZE),
    ]);
    return {
      state: "ready",
      total: totals[0]?.total ?? 0,
      unread,
      page: options.page,
      items: rows.flatMap((row) => {
        const kind = parseKind(row.kind);
        if (!kind) return [];
        return [
          {
            id: row.id,
            kind,
            params: row.params,
            href: safeNotificationHref(row.href),
            read: row.readAt !== null,
            createdAt: row.createdAt,
          },
        ];
      }),
    };
  } catch {
    return { state: "unavailable" };
  }
}

export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  try {
    const rows = await getDatabase()
      .select({ unread: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
    return rows[0]?.unread ?? 0;
  } catch {
    return 0;
  }
}

export type NotificationMutation = "done" | "not_found" | "unavailable";

/** Marks one of the person's own notifications read (or unread). */
export async function setNotificationRead(
  userId: string,
  notificationId: string,
  read: boolean,
): Promise<NotificationMutation> {
  try {
    const rows = await getDatabase()
      .update(notification)
      .set({ readAt: read ? sql`now()` : null })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId),
        ),
      )
      .returning({ id: notification.id });
    return rows.length > 0 ? "done" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<NotificationMutation> {
  try {
    await getDatabase()
      .update(notification)
      .set({ readAt: sql`now()` })
      .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
    return "done";
  } catch {
    return "unavailable";
  }
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<NotificationMutation> {
  try {
    const rows = await getDatabase()
      .delete(notification)
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId),
        ),
      )
      .returning({ id: notification.id });
    return rows.length > 0 ? "done" : "not_found";
  } catch {
    return "unavailable";
  }
}

/** Removes the person's read notifications; unread ones are kept. */
export async function clearReadNotifications(
  userId: string,
): Promise<NotificationMutation> {
  try {
    await getDatabase()
      .delete(notification)
      .where(
        and(eq(notification.userId, userId), isNotNull(notification.readAt)),
      );
    return "done";
  } catch {
    return "unavailable";
  }
}

/** Retention: drops read notifications past their keep period. */
export async function pruneReadNotifications(
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * DAY_MS,
  );
  const rows = await getDatabase()
    .delete(notification)
    .where(and(isNotNull(notification.readAt), lt(notification.readAt, cutoff)))
    .returning({ id: notification.id });
  return rows.length;
}
