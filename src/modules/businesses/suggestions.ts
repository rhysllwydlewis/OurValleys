import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { businessSuggestion } from "@/lib/database/schema/business-operations";
import {
  businessSuggestionStatuses,
  normaliseSuggestionInput,
  type BusinessSuggestionStatus,
} from "./suggestion-input";

export type SubmitSuggestionResult =
  { status: "submitted" } | { status: "invalid" } | { status: "unavailable" };

/**
 * Public write: stores a private lead for admins. Nothing is published, no
 * business record is created, and nobody is contacted.
 */
export async function submitBusinessSuggestion(
  rawInput: unknown,
): Promise<SubmitSuggestionResult> {
  const input = normaliseSuggestionInput(rawInput);
  if (!input) return { status: "invalid" };
  try {
    await getDatabase().insert(businessSuggestion).values({
      name: input.name,
      placeText: input.placeText,
      categoryText: input.categoryText,
      note: input.note,
      contactEmail: input.contactEmail,
      dedupeKey: input.dedupeKey,
    });
    return { status: "submitted" };
  } catch {
    return { status: "unavailable" };
  }
}

export type AdminSuggestion = {
  id: string;
  name: string;
  placeText: string;
  categoryText: string | null;
  note: string | null;
  contactEmail: string | null;
  status: BusinessSuggestionStatus;
  createdAt: Date;
  /** How many suggestions (including this one) share the same name and place. */
  sameCount: number;
};

export type ListSuggestionsResult =
  { state: "ready"; suggestions: AdminSuggestion[] } | { state: "unavailable" };

export async function listBusinessSuggestions(
  status?: BusinessSuggestionStatus,
): Promise<ListSuggestionsResult> {
  try {
    const rows = await getDatabase()
      .select({
        id: businessSuggestion.id,
        name: businessSuggestion.name,
        placeText: businessSuggestion.placeText,
        categoryText: businessSuggestion.categoryText,
        note: businessSuggestion.note,
        contactEmail: businessSuggestion.contactEmail,
        status: businessSuggestion.status,
        createdAt: businessSuggestion.createdAt,
        sameCount: sql<number>`count(*) over (partition by ${businessSuggestion.dedupeKey})::integer`,
      })
      .from(businessSuggestion)
      .where(status ? eq(businessSuggestion.status, status) : undefined)
      .orderBy(desc(businessSuggestion.createdAt))
      .limit(200);
    return {
      state: "ready",
      suggestions: rows.map((row) => ({
        ...row,
        status: row.status as BusinessSuggestionStatus,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}

const reviewSchema = z.object({
  suggestionId: z.uuid(),
  status: z.enum(businessSuggestionStatuses),
  adminUserId: z.uuid(),
});

export type ReviewSuggestionResult =
  { status: "updated" } | { status: "not_found" } | { status: "unavailable" };

export async function reviewBusinessSuggestion(
  rawInput: z.infer<typeof reviewSchema>,
): Promise<ReviewSuggestionResult> {
  const parsed = reviewSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  try {
    const rows = await getDatabase()
      .update(businessSuggestion)
      .set({
        status: parsed.data.status,
        reviewedByUserId: parsed.data.adminUserId,
        reviewedAt: new Date(),
      })
      .where(and(eq(businessSuggestion.id, parsed.data.suggestionId)))
      .returning({ id: businessSuggestion.id });
    return rows.length > 0 ? { status: "updated" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}
