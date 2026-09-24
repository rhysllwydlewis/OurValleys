import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { featureFlag } from "@/lib/database/schema";
import {
  featureFlagEnvironments,
  type FeatureFlagEnvironment,
} from "./feature-flag-environments";

export { featureFlagEnvironments, type FeatureFlagEnvironment };

function currentEnvironment(): FeatureFlagEnvironment {
  const value = process.env.NODE_ENV;
  return value === "production" || value === "test" ? value : "development";
}

const keySchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens.",
  )
  .min(2)
  .max(80);

const environmentsSchema = z
  .array(z.enum(featureFlagEnvironments))
  .max(featureFlagEnvironments.length)
  .default([]);

export const createFeatureFlagInputSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(500),
  enabled: z.boolean().default(false),
  environments: environmentsSchema,
});

export const updateFeatureFlagInputSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(500),
  enabled: z.boolean(),
  environments: environmentsSchema,
});

export type FeatureFlagRecord = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environments: string[];
  updatedAt: Date;
};

export type FeatureFlagListResult =
  | { state: "ready"; flags: FeatureFlagRecord[] }
  | { state: "unavailable"; flags: [] };

export async function listFeatureFlagsForAdmin(): Promise<FeatureFlagListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: featureFlag.id,
        key: featureFlag.key,
        name: featureFlag.name,
        description: featureFlag.description,
        enabled: featureFlag.enabled,
        environments: featureFlag.environments,
        updatedAt: featureFlag.updatedAt,
      })
      .from(featureFlag)
      .orderBy(asc(featureFlag.key));
    return { state: "ready", flags: rows };
  } catch {
    return { state: "unavailable", flags: [] };
  }
}

/**
 * Server-enforced feature gate. A flag that does not exist, or that has not
 * been explicitly turned on, is always treated as disabled — future modules
 * stay off by default until an admin turns them on for the running
 * environment. Never throws: a lookup failure must fail closed, not crash
 * the caller.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        enabled: featureFlag.enabled,
        environments: featureFlag.environments,
      })
      .from(featureFlag)
      .where(eq(featureFlag.key, key))
      .limit(1);
    if (!row || !row.enabled) return false;
    if (row.environments.length === 0) return true;
    return row.environments.includes(currentEnvironment());
  } catch {
    return false;
  }
}

export type MutateFeatureFlagResult =
  | { status: "created"; id: string }
  | { status: "updated" }
  | { status: "not_found" }
  | { status: "duplicate_key" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function createFeatureFlagForAdmin(
  rawInput: unknown,
  actorUserId: string,
): Promise<MutateFeatureFlagResult> {
  const parsed = createFeatureFlagInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const [created] = await database
      .insert(featureFlag)
      .values({ ...parsed.data, updatedByUserId: actorUserId })
      .returning({ id: featureFlag.id });
    return created
      ? { status: "created", id: created.id }
      : { status: "unavailable" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_key" };
    return { status: "unavailable" };
  }
}

export async function updateFeatureFlagForAdmin(
  rawInput: unknown,
  actorUserId: string,
): Promise<MutateFeatureFlagResult> {
  const parsed = updateFeatureFlagInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const { id, ...values } = parsed.data;
    const [updated] = await database
      .update(featureFlag)
      .set({ ...values, updatedByUserId: actorUserId, updatedAt: new Date() })
      .where(eq(featureFlag.id, id))
      .returning({ id: featureFlag.id });
    return updated ? { status: "updated" } : { status: "not_found" };
  } catch {
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
