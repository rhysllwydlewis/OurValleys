import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { residentPreference } from "@/lib/database/schema/resident-preference";
import { isLocale, type Locale } from "@/lib/i18n/config";

/** The language a signed-in resident saved, or undefined if none. */
export async function readSavedLocale(
  userId: string,
): Promise<Locale | undefined> {
  const [row] = await getDatabase()
    .select({ locale: residentPreference.locale })
    .from(residentPreference)
    .where(eq(residentPreference.userId, userId))
    .limit(1);
  return isLocale(row?.locale) ? row.locale : undefined;
}

export async function saveLocale(
  userId: string,
  locale: Locale,
): Promise<void> {
  await getDatabase()
    .insert(residentPreference)
    .values({ userId, locale })
    .onConflictDoUpdate({
      target: residentPreference.userId,
      set: { locale, updatedAt: new Date() },
    });
}
