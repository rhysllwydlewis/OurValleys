"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { saveOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";

const saveSectionInputSchema = z.object({
  businessId: z.uuid(),
  expectedVersion: z.number().int().min(0).max(1_000_000_000),
  section: z.enum(["profile", "location"]),
  payload: z.unknown(),
});

export type SaveSectionIssue = {
  field: string;
  message: string;
};

export type SaveSectionResult =
  | { status: "saved"; version: number; savedAt: string }
  | { status: "invalid"; issues: SaveSectionIssue[] }
  | { status: "conflict"; currentVersion: number }
  | { status: "forbidden" }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

async function readSessionUserId(): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function saveOnboardingSection(
  input: unknown,
): Promise<SaveSectionResult> {
  const parsed = saveSectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: [{ field: "", message: "The submitted form was not valid." }],
    };
  }

  const userId = await readSessionUserId();
  if (!userId) return { status: "unauthenticated" };

  const { businessId, expectedVersion, section, payload } = parsed.data;
  const result = await saveOnboardingDraftForUser({
    userId,
    businessId,
    expectedVersion,
    ...(section === "profile" ? { profile: payload } : { location: payload }),
  });

  switch (result.status) {
    case "saved":
      return {
        status: "saved",
        version: result.draft.version,
        savedAt: result.draft.updatedAt.toISOString(),
      };
    case "invalid":
      return {
        status: "invalid",
        issues: result.issues.map((issue) => ({
          field: issue.path.map(String).join("."),
          message: issue.message,
        })),
      };
    case "conflict":
      return { status: "conflict", currentVersion: result.currentVersion };
    case "forbidden":
      return { status: "forbidden" };
    case "missing":
    case "unavailable":
      return { status: "unavailable" };
  }
}
