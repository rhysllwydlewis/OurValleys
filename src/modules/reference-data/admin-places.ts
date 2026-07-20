import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens.",
  )
  .min(2)
  .max(80);

const optionalWelshName = z
  .string()
  .trim()
  .max(120)
  .transform((value) => (value.length === 0 ? null : value))
  .optional();

export const createPlaceInputSchema = z.object({
  canonicalName: z.string().trim().min(2).max(120),
  welshName: optionalWelshName,
  slug: slugSchema,
  placeType: z.string().trim().min(2).max(60),
  editorialSummary: z.string().trim().min(10).max(500),
});

export const updatePlaceInputSchema = z.object({
  id: z.uuid(),
  canonicalName: z.string().trim().min(2).max(120),
  welshName: optionalWelshName,
  slug: slugSchema,
  placeType: z.string().trim().min(2).max(60),
  coverageStatus: z.enum(["seeding", "active", "paused"]),
  editorialSummary: z.string().trim().min(10).max(500),
  status: z.enum(["active", "inactive"]),
});

export type AdminPlace = {
  id: string;
  canonicalName: string;
  welshName: string | null;
  slug: string;
  placeType: string;
  coverageStatus: string;
  editorialSummary: string;
  status: string;
};

export type AdminPlaceListResult =
  | { state: "ready"; places: AdminPlace[] }
  | { state: "unavailable"; places: [] };

export async function listAllPlacesForAdmin(): Promise<AdminPlaceListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: place.id,
        canonicalName: place.canonicalName,
        welshName: place.welshName,
        slug: place.slug,
        placeType: place.placeType,
        coverageStatus: place.coverageStatus,
        editorialSummary: place.editorialSummary,
        status: place.status,
      })
      .from(place)
      .orderBy(asc(place.canonicalName));
    return { state: "ready", places: rows };
  } catch {
    return { state: "unavailable", places: [] };
  }
}

export type MutatePlaceResult =
  | { status: "created"; id: string }
  | { status: "updated" }
  | { status: "not_found" }
  | { status: "duplicate_slug" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function createPlaceForAdmin(
  rawInput: unknown,
): Promise<MutatePlaceResult> {
  const parsed = createPlaceInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const [created] = await database
      .insert(place)
      .values({ ...parsed.data, welshName: parsed.data.welshName ?? null })
      .returning({ id: place.id });
    return created
      ? { status: "created", id: created.id }
      : { status: "unavailable" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

export async function updatePlaceForAdmin(
  rawInput: unknown,
): Promise<MutatePlaceResult> {
  const parsed = updatePlaceInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const { id, ...values } = parsed.data;
    const [updated] = await database
      .update(place)
      .set({ ...values, welshName: values.welshName ?? null })
      .where(eq(place.id, id))
      .returning({ id: place.id });
    return updated ? { status: "updated" } : { status: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return errorCode(candidate.cause);
}

function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === "23505";
}
