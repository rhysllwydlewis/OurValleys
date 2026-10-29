import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { noticeMute } from "@/lib/database/schema/notice-preference";
import { mutedKindsFor } from "./notice-preferences-model";
import { parseKind, type NotificationKind } from "./notification-model";

/**
 * The notice kinds a person has switched off. A read failure answers "none",
 * so a database blip never silences a notice the person wanted.
 */
export async function listMutedKinds(
  userId: string,
): Promise<Set<NotificationKind>> {
  try {
    const rows = await getDatabase()
      .select({ kind: noticeMute.kind })
      .from(noticeMute)
      .where(eq(noticeMute.userId, userId));
    return new Set(rows.flatMap((row) => parseKind(row.kind) ?? []));
  } catch {
    return new Set();
  }
}

export type SavePreferencesResult = "saved" | "unavailable";

/**
 * Replaces a person's switches in one transaction: the kinds in `enabled`
 * stay on, every other kind is muted. Only the caller's own rows are touched.
 */
export async function saveNoticePreferences(
  userId: string,
  enabled: readonly NotificationKind[],
): Promise<SavePreferencesResult> {
  const muted = mutedKindsFor(enabled);
  try {
    await getDatabase().transaction(async (tx) => {
      // One save per person at a time, so two tabs with different choices
      // end with exactly one of them rather than a blend.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`notice-mute:${userId}`}, 0))`,
      );
      // Kinds left on lose their mute; kinds muted are added if missing. Two
      // saves at once (a double click, two tabs) cannot collide on the key.
      await tx
        .delete(noticeMute)
        .where(
          and(
            eq(noticeMute.userId, userId),
            inArray(noticeMute.kind, [...enabled]),
          ),
        );
      if (muted.length > 0) {
        await tx
          .insert(noticeMute)
          .values(muted.map((kind) => ({ userId, kind })))
          .onConflictDoNothing();
      }
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}
