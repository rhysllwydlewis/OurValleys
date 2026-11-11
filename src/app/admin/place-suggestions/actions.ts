"use server";

import { updateTag } from "next/cache";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import {
  resolvePlaceSuggestion,
  type ResolvePlaceSuggestionResult,
} from "@/modules/reference-data/place-suggestions";

export type PlaceSuggestionActionResult =
  ResolvePlaceSuggestionResult | { status: "forbidden" };

/**
 * Admin decision on a place suggestion: dismiss it, mark it handled, or add a
 * suggested fact to the place profile. Platform admins only.
 */
export async function resolvePlaceSuggestionAction(
  input: unknown,
): Promise<PlaceSuggestionActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await resolvePlaceSuggestion(input, admin.userId);
  if (result.status === "resolved") {
    const decided = input as {
      suggestionId?: string;
      outcome?: "applied" | "dismissed";
    };
    if (result.addedFact) updateTag("business-directory");
    await recordAdminAudit({
      actorUserId: admin.userId,
      action:
        decided.outcome === "dismissed"
          ? "place_suggestion.dismissed"
          : "place_suggestion.applied",
      targetType: "place_suggestion",
      targetId: decided.suggestionId,
      metadata: { addedFact: result.addedFact },
    });
  }
  return result;
}
