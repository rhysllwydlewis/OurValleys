import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeProfile, placeSuggestion } from "@/lib/database/schema/reference";
import { parseStoredFacts } from "./place-profile-model";
import {
  applySuggestedFact,
  normalisePlaceSuggestion,
  resolveSuggestionSchema,
  type PlaceSuggestionKind,
  type PlaceSuggestionStatus,
} from "./place-suggestion-model";

export type SubmitPlaceSuggestionResult =
  | { status: "submitted" }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Public write: stores a private suggestion for admins. Nothing is published
 * and nobody is contacted. Only active places can be suggested
 * against, so the form cannot be used to probe unpublished places.
 */
export async function submitPlaceSuggestion(
  rawInput: unknown,
): Promise<SubmitPlaceSuggestionResult> {
  const input = normalisePlaceSuggestion(rawInput);
  if (!input) return { status: "invalid" };
  try {
    const database = getDatabase();
    const [target] = await database
      .select({ id: place.id })
      .from(place)
      .where(and(eq(place.slug, input.placeSlug), eq(place.status, "active")))
      .limit(1);
    if (!target) return { status: "not_found" };
    await database.insert(placeSuggestion).values({
      placeId: target.id,
      kind: input.kind,
      factLabel: input.factLabel,
      message: input.message,
    });
    return { status: "submitted" };
  } catch {
    return { status: "unavailable" };
  }
}

export type AdminPlaceSuggestion = {
  id: string;
  placeId: string;
  placeName: string;
  placeSlug: string;
  kind: PlaceSuggestionKind;
  factLabel: string | null;
  message: string;
  status: PlaceSuggestionStatus;
  createdAt: Date;
};

export type ListPlaceSuggestionsResult =
  | { state: "ready"; suggestions: AdminPlaceSuggestion[] }
  | { state: "unavailable" };

/** Admin list. `new` is shown oldest first (a queue); decided newest first. */
export async function listPlaceSuggestions(
  status: PlaceSuggestionStatus = "new",
): Promise<ListPlaceSuggestionsResult> {
  try {
    const rows = await getDatabase()
      .select({
        id: placeSuggestion.id,
        placeId: placeSuggestion.placeId,
        placeName: place.canonicalName,
        placeSlug: place.slug,
        kind: placeSuggestion.kind,
        factLabel: placeSuggestion.factLabel,
        message: placeSuggestion.message,
        status: placeSuggestion.status,
        createdAt: placeSuggestion.createdAt,
      })
      .from(placeSuggestion)
      .innerJoin(place, eq(place.id, placeSuggestion.placeId))
      .where(eq(placeSuggestion.status, status))
      .orderBy(
        status === "new"
          ? asc(placeSuggestion.createdAt)
          : desc(placeSuggestion.createdAt),
      )
      .limit(200);
    return {
      state: "ready",
      suggestions: rows.map((row) => ({
        ...row,
        kind: row.kind as PlaceSuggestionKind,
        status: row.status as PlaceSuggestionStatus,
      })),
    };
  } catch {
    return { state: "unavailable" };
  }
}

export async function countPlaceSuggestionsByStatus(): Promise<Record<
  PlaceSuggestionStatus,
  number
> | null> {
  try {
    const rows = await getDatabase()
      .select({
        status: placeSuggestion.status,
        total: sql<number>`count(*)::integer`,
      })
      .from(placeSuggestion)
      .groupBy(placeSuggestion.status);
    const counts: Record<PlaceSuggestionStatus, number> = {
      new: 0,
      applied: 0,
      dismissed: 0,
    };
    for (const row of rows) {
      if (row.status in counts)
        counts[row.status as PlaceSuggestionStatus] = row.total;
    }
    return counts;
  } catch {
    return null;
  }
}

export type ResolvePlaceSuggestionResult =
  | { status: "resolved"; placeSlug: string; addedFact: boolean }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "already_decided" }
  | { status: "profile_full" }
  | { status: "duplicate_fact" }
  | { status: "unavailable" };

/**
 * Decides a suggestion. The caller authorises the admin. When `addAsFact` is
 * set on a fact suggestion, the fact is appended to the place profile and the
 * suggestion is marked applied in one transaction, so a refused apply (full or
 * duplicate heading) leaves the suggestion open. Only `new` suggestions can be
 * decided, so a double click or a second admin cannot apply a fact twice.
 */
export async function resolvePlaceSuggestion(
  rawInput: unknown,
  adminUserId: string,
): Promise<ResolvePlaceSuggestionResult> {
  const parsed = resolveSuggestionSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid" };
  const { suggestionId, outcome, addAsFact } = parsed.data;
  if (addAsFact && outcome !== "applied") return { status: "invalid" };

  try {
    return await getDatabase().transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: placeSuggestion.id,
          placeId: placeSuggestion.placeId,
          kind: placeSuggestion.kind,
          factLabel: placeSuggestion.factLabel,
          message: placeSuggestion.message,
          status: placeSuggestion.status,
          placeSlug: place.slug,
        })
        .from(placeSuggestion)
        .innerJoin(place, eq(place.id, placeSuggestion.placeId))
        .where(eq(placeSuggestion.id, suggestionId))
        .for("update", { of: placeSuggestion })
        .limit(1);
      if (!row) return { status: "not_found" } as const;
      if (row.status !== "new") return { status: "already_decided" } as const;

      let addedFact = false;
      if (addAsFact) {
        const [profile] = await tx
          .select({ facts: placeProfile.facts })
          .from(placeProfile)
          .where(eq(placeProfile.placeId, row.placeId))
          .for("update")
          .limit(1);
        const decision = applySuggestedFact(
          parseStoredFacts(profile?.facts ?? []),
          {
            kind: row.kind as PlaceSuggestionKind,
            factLabel: row.factLabel,
            message: row.message,
          },
        );
        if (!decision.ok) {
          return decision.reason === "full"
            ? ({ status: "profile_full" } as const)
            : decision.reason === "duplicate"
              ? ({ status: "duplicate_fact" } as const)
              : ({ status: "invalid" } as const);
        }
        await tx
          .insert(placeProfile)
          .values({
            placeId: row.placeId,
            facts: decision.facts,
            updatedByUserId: adminUserId,
          })
          .onConflictDoUpdate({
            target: placeProfile.placeId,
            set: {
              facts: decision.facts,
              updatedByUserId: adminUserId,
              updatedAt: new Date(),
            },
          });
        addedFact = true;
      }

      await tx
        .update(placeSuggestion)
        .set({
          status: outcome,
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(placeSuggestion.id, suggestionId),
            eq(placeSuggestion.status, "new"),
          ),
        );
      return {
        status: "resolved",
        placeSlug: row.placeSlug,
        addedFact,
      } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}
