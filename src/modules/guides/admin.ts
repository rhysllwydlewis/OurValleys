import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import {
  assessGuideReadiness,
  describeGuideIssues,
  estimateReadingMinutes,
  readingTimeLabel,
} from "./guide-model";
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
  /** Left blank, it is filled with the estimate from the guide's length. */
  readingTime: z.string().trim().max(60).default(""),
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

function withReadingTime<
  T extends {
    readingTime: string;
    summary: string;
    sections: readonly { heading: string; body: string }[];
  },
>(values: T): T {
  if (values.readingTime) return values;
  return {
    ...values,
    readingTime: readingTimeLabel(estimateReadingMinutes(values)),
  };
}

export const createGuideInputSchema = guideFieldsSchema;
export const updateGuideInputSchema = guideFieldsSchema.extend({
  id: z.uuid(),
  /** The `updatedAt` the editor loaded; a newer save by someone else is refused. */
  expectedUpdatedAt: z.iso.datetime().optional(),
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
  | { status: "created"; id: string; updatedAt: string }
  | { status: "updated"; updatedAt: string }
  | { status: "not_found" }
  | { status: "duplicate_slug" }
  | { status: "conflict" }
  | { status: "invalid"; issues: string[] }
  | { status: "unavailable" };

export async function getGuideForAdmin(
  rawId: unknown,
): Promise<AdminGuide | null> {
  const parsedId = z.uuid().safeParse(rawId);
  if (!parsedId.success) return null;
  try {
    const database = getDatabase();
    const [row] = await database
      .select()
      .from(guide)
      .where(eq(guide.id, parsedId.data))
      .limit(1);
    return row ? toAdminGuide(row) : null;
  } catch {
    return null;
  }
}

export async function createGuideForAdmin(
  rawInput: unknown,
): Promise<MutateGuideResult> {
  const parsed = createGuideInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: describeGuideIssues(parsed.error.issues),
    };
  }

  try {
    const database = getDatabase();
    const [created] = await database
      .insert(guide)
      .values({
        ...withReadingTime(parsed.data),
        placeId: parsed.data.placeId ?? null,
      })
      .returning({ id: guide.id, updatedAt: guide.updatedAt });
    return created
      ? {
          status: "created",
          id: created.id,
          updatedAt: created.updatedAt.toISOString(),
        }
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
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: describeGuideIssues(parsed.error.issues),
    };
  }

  try {
    const database = getDatabase();
    const { id, expectedUpdatedAt, ...fields } = parsed.data;
    const values = withReadingTime(fields);
    const savedAt = new Date();
    const [updated] = await database
      .update(guide)
      .set({
        ...values,
        placeId: values.placeId ?? null,
        updatedAt: savedAt,
      })
      .where(
        and(
          eq(guide.id, id),
          expectedUpdatedAt
            ? sql`date_trunc('milliseconds', ${guide.updatedAt}) = ${expectedUpdatedAt}::timestamptz`
            : undefined,
        ),
      )
      .returning({ id: guide.id });
    if (updated) {
      return { status: "updated", updatedAt: savedAt.toISOString() };
    }
    if (!expectedUpdatedAt) return { status: "not_found" };
    const [existing] = await database
      .select({ id: guide.id })
      .from(guide)
      .where(eq(guide.id, id))
      .limit(1);
    return existing ? { status: "conflict" } : { status: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

export type SetGuideStatusResult =
  "updated" | "not_found" | "invalid" | "not_ready" | "unavailable";

/**
 * A status change leaves `updatedAt` alone: it records when the words last
 * changed, which the public page shows and the editor's stale-save check uses.
 */
async function setGuideStatus(
  rawId: unknown,
  status: GuideStatus,
): Promise<SetGuideStatusResult> {
  const parsedId = z.uuid().safeParse(rawId);
  if (!parsedId.success) return "invalid";

  try {
    const database = getDatabase();
    if (status === "published") {
      // Publishing re-checks the blocking readiness checks on the server, so
      // the studio's checklist is guidance and this is the rule.
      const [current] = await database
        .select()
        .from(guide)
        .where(eq(guide.id, parsedId.data))
        .limit(1);
      if (!current) return "not_found";
      const readiness = assessGuideReadiness({
        summary: current.summary,
        readingTime: current.readingTime,
        placeId: current.placeId,
        reviewDueAt: current.reviewDueAt,
        sections: parseStoredSections(current.sections),
      });
      if (!readiness.canPublish) return "not_ready";
    }
    const [updated] = await database
      .update(guide)
      .set({
        status,
        publishedAt: status === "published" ? new Date() : null,
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
      .set({ status: "draft", publishedAt: null })
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
