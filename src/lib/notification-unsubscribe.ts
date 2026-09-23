import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getServerEnvironment } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { businessLifecycle } from "@/lib/database/schema/business-operations";

/**
 * Optional (non-transactional) email categories a resident or business can
 * be unsubscribed from without signing in. Transactional email (account
 * verification, password reset, enquiry delivery, team invitations) has no
 * category here and is never suppressible.
 */
export const notificationCategories = [
  "saved_event_cancellation",
  "business_lifecycle",
] as const;

export type NotificationCategory = (typeof notificationCategories)[number];

export function isNotificationCategory(
  value: string,
): value is NotificationCategory {
  return (notificationCategories as readonly string[]).includes(value);
}

const tokenPattern = /^[a-f0-9]{64}$/;

/**
 * A stable, deterministic unsubscribe token derived from the server secret
 * so no separate token table or expiry bookkeeping is needed: the same
 * link keeps working for the life of the subscription, matching common
 * one-click-unsubscribe conventions.
 */
export function createUnsubscribeToken(
  category: NotificationCategory,
  subjectId: string,
): string {
  return createHmac("sha256", getServerEnvironment().BETTER_AUTH_SECRET)
    .update(`${category}:${subjectId}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(
  category: NotificationCategory,
  subjectId: string,
  token: string,
): boolean {
  if (!tokenPattern.test(token)) return false;
  const expected = createUnsubscribeToken(category, subjectId);
  const provided = Buffer.from(token, "hex");
  const wanted = Buffer.from(expected, "hex");
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

export function buildUnsubscribeUrl(
  category: NotificationCategory,
  subjectId: string,
): string {
  const token = createUnsubscribeToken(category, subjectId);
  return new URL(
    `/unsubscribe/${category}/${subjectId}/${token}`,
    getSiteUrl(),
  ).toString();
}

/**
 * Turns off future delivery for the given category and subject. Verifies
 * the token again so this can never be reached with a forged subject id,
 * even if a caller forgets to check first. Idempotent: unsubscribing twice
 * is a no-op, not an error.
 */
export async function applyUnsubscribe(
  category: NotificationCategory,
  subjectId: string,
  token: string,
): Promise<"unsubscribed" | "invalid" | "unavailable"> {
  if (!verifyUnsubscribeToken(category, subjectId, token)) return "invalid";
  try {
    const database = getDatabase();
    if (category === "saved_event_cancellation") {
      const [row] = await database
        .update(user)
        .set({ savedEventCancellationEmails: false })
        .where(eq(user.id, subjectId))
        .returning({ id: user.id });
      if (!row) return "invalid";
      return "unsubscribed";
    }
    await database
      .insert(businessLifecycle)
      .values({ businessId: subjectId, lifecycleEmailsEnabled: false })
      .onConflictDoUpdate({
        target: businessLifecycle.businessId,
        set: { lifecycleEmailsEnabled: false, updatedAt: sql`now()` },
      });
    return "unsubscribed";
  } catch {
    return "unavailable";
  }
}
