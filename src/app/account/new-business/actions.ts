"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
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
  | { status: "denied" };

const actionSchema = businessCreationSchema.extend({
  confirmedDistinct: z.boolean(),
});

async function readVerifiedUser(): Promise<{ id: string } | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return null;
    if (!session.user.emailVerified) return null;
    // Every intentionally public demonstration account is restricted to its
    // supplied journey and must never create additional business records.
    if (isPublicDemoEmail(session.user.email)) return null;
    return { id: session.user.id };
  } catch {
    return null;
  }
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

  const user = await readVerifiedUser();
  if (!user) return { status: "denied" };

  if (!parsed.data.confirmedDistinct) {
    const matches = await findSimilarPublishedBusinesses(
      parsed.data.tradingName,
    );
    if (matches.length > 0) {
      return { status: "matches", matches };
    }
  }

  const { tradingName, primaryCategoryId, placeId, businessType } = parsed.data;
  return createBusinessDraft({
    userId: user.id,
    creation: { tradingName, primaryCategoryId, placeId, businessType },
  });
}
