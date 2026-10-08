"use server";

import { z } from "zod";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { businessSuggestionStatuses } from "@/modules/businesses/suggestion-input";
import { reviewBusinessSuggestion } from "@/modules/businesses/suggestions";

const inputSchema = z.object({
  suggestionId: z.uuid(),
  status: z.enum(businessSuggestionStatuses),
});

export type SuggestionActionResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function reviewSuggestionAction(
  input: unknown,
): Promise<SuggestionActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await reviewBusinessSuggestion({
    suggestionId: parsed.data.suggestionId,
    status: parsed.data.status,
    adminUserId: admin.userId,
  });
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business_suggestion.status_changed",
      targetType: "business_suggestion",
      targetId: parsed.data.suggestionId,
      metadata: { status: parsed.data.status },
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}
