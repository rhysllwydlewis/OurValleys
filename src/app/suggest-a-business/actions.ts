"use server";

import { headers } from "next/headers";
import { createRateLimiter } from "@/lib/rate-limit";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { normaliseSuggestionInput } from "@/modules/businesses/suggestion-input";
import {
  submitBusinessSuggestion,
  type SubmitSuggestionResult,
} from "@/modules/businesses/suggestions";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function submitBusinessSuggestionAction(
  input: unknown,
): Promise<SubmitSuggestionResult | { status: "rate_limited" }> {
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
  if (!limiter.allow(visitor)) return { status: "rate_limited" };

  return submitBusinessSuggestion(input);
}
