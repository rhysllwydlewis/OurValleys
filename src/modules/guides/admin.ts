import "server-only";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { guideSectionsSchema, parseStoredSections } from "./shared";
import type { GuideSection, GuideStatus } from "./shared";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens.",
  )
  .min(2)
  .max(120);

const guideFieldsSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: slugSchema,
  summary: z.string().trim().min(10).max(500),
  areaLabel: z.string().trim().min(2).max(120),
  readingTime: z.string().trim().min(2).max(60),
  authorName: z.string().trim().min(2).max(120),
  sponsorshipDisclosure: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : null)),
  placeId: z.uuid().optional().nullable(),
  reviewDueAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? new Date(value) : null)),
  sections: guideSectionsSchema,
});

export const createGuideInputSchema = guideFieldsSchema;
export const updateGuideInputSchema = guideFieldsSchema.extend({
  id: z.uuid(),
});

export type AdminGuide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  placeId: string | null;
  status: GuideStatus;
  sections: GuideSection[];
  reviewDueAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminGuideListResult =
  | { state: "ready"; guides: AdminGuide[] }
  | { state: "unavailable"; guides: [] };

function toAdminGuide(row: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  placeId: string | null;
  status: string;
  sections: unknown;
  reviewDueAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminGuide {
  return {
    ...row,
    status: row.status as GuideStatus,
    sections: parseStoredSections(row.sections),
  };
}

export async function listAllGuidesForAdmin(
  statusFilter?: GuideStatus,
): Promise<AdminGuideListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(guide)
      .where(statusFilter ? eq(guide.status, statusFilter) : undefined)
      .orderBy(desc(guide.updatedAt));
    return { state: "ready", guides: rows.map(toAdminGuide) };
  } catch {
    return { state: "unavailable", guides: [] };
  }
}

export type MutateGuideResult =
  | { status: "created"; id: string }
  | { status: "updated" }
  | { status: "not_found" }
  | { status: "duplicate_slug" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function createGuideForAdmin(
  rawInput: unknown,
): Promise<MutateGuideResult> {
  const parsed = createGuideInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const [created] = await database
      .insert(guide)
      .values({ ...parsed.data, placeId: parsed.data.placeId ?? null })
      .returning({ id: guide.id });
    return created
      ? { status: "created", id: created.id }
      : { status: "unavailable" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

export async function updateGuideForAdmin(
  rawInput: unknown,
): Promise<MutateGuideResult> {
  const parsed = updateGuideInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const { id, ...values } = parsed.data;
    const [updated] = await database
      .update(guide)
      .set({
        ...values,
        placeId: values.placeId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(guide.id, id))
      .returning({ id: guide.id });
    return updated ? { status: "updated" } : { status: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

export type SetGuideStatusResult =
  "updated" | "not_found" | "invalid" | "unavailable";

async function setGuideStatus(
  rawId: unknown,
  status: GuideStatus,
): Promise<SetGuideStatusResult> {
  const parsedId = z.uuid().safeParse(rawId);
  if (!parsedId.success) return "invalid";

  try {
    const database = getDatabase();
    const [updated] = await database
      .update(guide)
      .set({
        status,
        publishedAt: status === "published" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(guide.id, parsedId.data))
      .returning({ id: guide.id });
    return updated ? "updated" : "not_found";
  } catch {
    return "unavailable";
  }
}

export function publishGuideForAdmin(
  id: unknown,
): Promise<SetGuideStatusResult> {
  return setGuideStatus(id, "published");
}

export function archiveGuideForAdmin(
  id: unknown,
): Promise<SetGuideStatusResult> {
  return setGuideStatus(id, "archived");
}

export async function revertGuideToDraftForAdmin(
  rawId: unknown,
): Promise<SetGuideStatusResult> {
  const parsedId = z.uuid().safeParse(rawId);
  if (!parsedId.success) return "invalid";

  try {
    const database = getDatabase();
    const [updated] = await database
      .update(guide)
      .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
      .where(eq(guide.id, parsedId.data))
      .returning({ id: guide.id });
    return updated ? "updated" : "not_found";
  } catch {
    return "unavailable";
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
