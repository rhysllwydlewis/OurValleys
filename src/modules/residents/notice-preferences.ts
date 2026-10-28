import "server-only";
import { eq } from "drizzle-orm";
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
      await tx.delete(noticeMute).where(eq(noticeMute.userId, userId));
      if (muted.length > 0) {
        await tx
          .insert(noticeMute)
          .values(muted.map((kind) => ({ userId, kind })));
      }
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}
