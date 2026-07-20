import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { category } from "@/lib/database/schema/business";

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

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().min(10).max(500),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const updateCategoryInputSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().min(10).max(500),
  status: z.enum(["active", "inactive"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  sortOrder: number;
};

export type AdminCategoryListResult =
  | { state: "ready"; categories: AdminCategory[] }
  | { state: "unavailable"; categories: [] };

export async function listAllCategoriesForAdmin(): Promise<AdminCategoryListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        status: category.status,
        sortOrder: category.sortOrder,
      })
      .from(category)
      .orderBy(asc(category.sortOrder), asc(category.name));
    return { state: "ready", categories: rows };
  } catch {
    return { state: "unavailable", categories: [] };
  }
}

export type MutateCategoryResult =
  | { status: "created"; id: string }
  | { status: "updated" }
  | { status: "not_found" }
  | { status: "duplicate_slug" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function createCategoryForAdmin(
  rawInput: unknown,
): Promise<MutateCategoryResult> {
  const parsed = createCategoryInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const [created] = await database
      .insert(category)
      .values(parsed.data)
      .returning({ id: category.id });
    return created
      ? { status: "created", id: created.id }
      : { status: "unavailable" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    return { status: "unavailable" };
  }
}

export async function updateCategoryForAdmin(
  rawInput: unknown,
): Promise<MutateCategoryResult> {
  const parsed = updateCategoryInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const { id, ...values } = parsed.data;
    const [updated] = await database
      .update(category)
      .set(values)
      .where(eq(category.id, id))
      .returning({ id: category.id });
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
