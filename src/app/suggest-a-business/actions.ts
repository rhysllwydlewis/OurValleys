"use server";

import { headers } from "next/headers";
import { createRateLimiter } from "@/lib/rate-limit";
import { findSimilarPublishedBusinesses } from "@/modules/businesses/creation";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { normaliseSuggestionInput } from "@/modules/businesses/suggestion-input";
import {
  submitBusinessSuggestion,
  type SubmitSuggestionResult,
} from "@/modules/businesses/suggestions";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
// Looking for an already-listed business is a read, so it has its own, wider budget.
const lookupLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 60 * 1000,
});

/** A published business the suggested name may already be: public fields only. */
export type ListedMatch = {
  slug: string;
  tradingName: string;
  placeName: string | null;
};

export async function submitBusinessSuggestionAction(
  input: unknown,
): Promise<
  | SubmitSuggestionResult
  | { status: "rate_limited" }
  | { status: "possible_duplicates"; matches: ListedMatch[] }
> {
  const normalised = normaliseSuggestionInput(input);
  if (!normalised) return { status: "invalid" };
  // A filled honeypot is reported as success so bots learn nothing.
  if (normalised.website.length > 0) return { status: "submitted" };

  const requestHeaders = await headers();
  const visitor =
    hashVisitorSignal(
      [
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
        requestHeaders.get("user-agent"),
      ]
        .filter(Boolean)
        .join("|"),
    ) ?? "unknown";

  // Unless the visitor has said "it is a different business", point them at a
  // published business they may have meant instead of queuing a moderator task.
  const confirmedDifferent =
    typeof input === "object" &&
    input !== null &&
    (input as { differentBusiness?: unknown }).differentBusiness === true;
  if (!confirmedDifferent) {
    if (!lookupLimiter.allow(visitor)) return { status: "rate_limited" };
    const similar = await findSimilarPublishedBusinesses(normalised.name);
    const matches = similar
      .filter((match) => match.matchKind !== "possible")
      .slice(0, 3)
      .map(({ slug, tradingName, placeName }) => ({
        slug,
        tradingName,
        placeName,
      }));
    if (matches.length > 0) return { status: "possible_duplicates", matches };
  }

  if (!limiter.allow(visitor)) return { status: "rate_limited" };

  return submitBusinessSuggestion(input);
}
