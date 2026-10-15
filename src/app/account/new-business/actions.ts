"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  businessCreationSchema,
  createBusinessDraft,
  findSimilarPublishedBusinesses,
  type CreateBusinessResult,
  type SimilarBusiness,
} from "@/modules/businesses/creation";

export type CreateBusinessActionResult =
  | { status: "matches"; matches: SimilarBusiness[] }
  | CreateBusinessResult
  | { status: "unverified" }
  | { status: "denied" };

export type FindSimilarActionResult =
  | { status: "ok"; matches: SimilarBusiness[] }
  | { status: "limited" }
  | { status: "denied" };

// The live "already listed?" check runs as people type, so it is bounded per
// account. State is per server instance, which is enough to blunt scripting.
const similarLimiter = createRateLimiter({ limit: 40, windowMs: 60_000 });

const similarInputSchema = z.object({
  name: z.string().max(200),
  placeId: z.uuid().nullable(),
});

const actionSchema = businessCreationSchema.extend({
  confirmedDistinct: z.boolean(),
});

type StartUser =
  { kind: "ok"; id: string } | { kind: "unverified" } | { kind: "denied" };

async function readStartUser(): Promise<StartUser> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return { kind: "denied" };
    // Every intentionally public demonstration account is restricted to its
    // supplied journey and must never create additional business records.
    if (isPublicDemoEmail(session.user.email)) return { kind: "denied" };
    if (!session.user.emailVerified) return { kind: "unverified" };
    return { kind: "ok", id: session.user.id };
  } catch {
    return { kind: "denied" };
  }
}

/**
 * Live duplicate check for the start-your-business form. It returns only the
 * public fields of published businesses, and only to a signed-in, verified,
 * non-demo account, so it cannot be used to enumerate the directory.
 */
export async function findSimilarBusinessesAction(
  input: unknown,
): Promise<FindSimilarActionResult> {
  const parsed = similarInputSchema.safeParse(input);
  if (!parsed.success) return { status: "ok", matches: [] };

  const user = await readStartUser();
  if (user.kind !== "ok") return { status: "denied" };
  if (!similarLimiter.allow(user.id)) return { status: "limited" };

  const matches = await findSimilarPublishedBusinesses(parsed.data.name, {
    placeId: parsed.data.placeId,
  });
  return { status: "ok", matches };
}

export async function createBusinessAction(
  input: unknown,
): Promise<CreateBusinessActionResult> {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Check the business name, category and location and try again.",
    };
  }

  const user = await readStartUser();
  if (user.kind === "unverified") return { status: "unverified" };
  if (user.kind !== "ok") return { status: "denied" };

  if (!parsed.data.confirmedDistinct) {
    const matches = await findSimilarPublishedBusinesses(
      parsed.data.tradingName,
      { placeId: parsed.data.placeId },
    );
    // Only a real likeness holds the owner up; a loose "possible" match is
    // shown live but must not block creating a distinct business.
    if (matches.some((match) => match.matchKind !== "possible")) {
      return { status: "matches", matches };
    }
  }

  const { tradingName, welshName, primaryCategoryId, placeId, businessType } =
    parsed.data;
  return createBusinessDraft({
    userId: user.id,
    creation: {
      tradingName,
      welshName,
      primaryCategoryId,
      placeId,
      businessType,
    },
  });
}
