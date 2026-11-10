import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeProfile } from "@/lib/database/schema/reference";
import {
  parseStoredFacts,
  placeProfileInputSchema,
  type PlaceProfile,
} from "./place-profile-model";

function toProfile(row: {
  welshSummary: string | null;
  about: string | null;
  aboutCy: string | null;
  facts: unknown;
}): PlaceProfile {
  return {
    welshSummary: row.welshSummary,
    about: row.about,
    aboutCy: row.aboutCy,
    facts: parseStoredFacts(row.facts),
  };
}

/**
 * Public profile of a place, or `null` when none has been written or the
 * database is unavailable (the place page then falls back to its summary).
 */
export const getPlaceProfile = cache(async function getPlaceProfile(
  placeId: string,
): Promise<PlaceProfile | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        welshSummary: placeProfile.welshSummary,
        about: placeProfile.about,
        aboutCy: placeProfile.aboutCy,
        facts: placeProfile.facts,
      })
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId))
      .limit(1);
    return row ? toProfile(row) : null;
  } catch {
    return null;
  }
});

export type AdminPlaceProfileResult =
  | {
      state: "ready";
      place: {
        id: string;
        canonicalName: string;
        welshName: string | null;
        slug: string;
        editorialSummary: string;
        status: string;
      };
      profile: PlaceProfile;
      updatedAt: Date | null;
    }
  | { state: "not_found" }
  | { state: "unavailable" };

/** Admin view of a place and its (possibly empty) profile. */
export async function getPlaceProfileForAdmin(
  placeId: string,
): Promise<AdminPlaceProfileResult> {
  if (!/^[0-9a-f-]{36}$/i.test(placeId)) return { state: "not_found" };
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        id: place.id,
        canonicalName: place.canonicalName,
        welshName: place.welshName,
        slug: place.slug,
        editorialSummary: place.editorialSummary,
        status: place.status,
        welshSummary: placeProfile.welshSummary,
        about: placeProfile.about,
        aboutCy: placeProfile.aboutCy,
        facts: placeProfile.facts,
        updatedAt: placeProfile.updatedAt,
      })
      .from(place)
      .leftJoin(placeProfile, eq(placeProfile.placeId, place.id))
      .where(eq(place.id, placeId))
      .limit(1);
    if (!row) return { state: "not_found" };
    return {
      state: "ready",
      place: {
        id: row.id,
        canonicalName: row.canonicalName,
        welshName: row.welshName,
        slug: row.slug,
        editorialSummary: row.editorialSummary,
        status: row.status,
      },
      profile: toProfile({
        welshSummary: row.welshSummary,
        about: row.about,
        aboutCy: row.aboutCy,
        facts: row.facts ?? [],
      }),
      updatedAt: row.updatedAt,
    };
  } catch {
    return { state: "unavailable" };
  }
}

export type SavePlaceProfileResult =
  | { status: "saved"; slug: string }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Creates or replaces a place's profile. The caller authorises the admin;
 * input is validated here and an unknown place never creates an orphan row.
 */
export async function savePlaceProfileForAdmin(
  rawInput: unknown,
  actorUserId: string | null,
): Promise<SavePlaceProfileResult> {
  const parsed = placeProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };
  const { placeId, ...values } = parsed.data;

  try {
    const database = getDatabase();
    const [target] = await database
      .select({ slug: place.slug })
      .from(place)
      .where(eq(place.id, placeId))
      .limit(1);
    if (!target) return { status: "not_found" };

    const row = { ...values, updatedByUserId: actorUserId };
    await database
      .insert(placeProfile)
      .values({ placeId, ...row })
      .onConflictDoUpdate({
        target: placeProfile.placeId,
        set: { ...row, updatedAt: new Date() },
      });
    return { status: "saved", slug: target.slug };
  } catch {
    return { status: "unavailable" };
  }
}
