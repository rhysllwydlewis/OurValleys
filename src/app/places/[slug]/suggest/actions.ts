"use server";

import { headers } from "next/headers";
import { createRateLimiter } from "@/lib/rate-limit";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import {
  submitPlaceSuggestion,
  type SubmitPlaceSuggestionResult,
} from "@/modules/reference-data/place-suggestions";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function submitPlaceSuggestionAction(
  input: unknown,
): Promise<SubmitPlaceSuggestionResult | { status: "rate_limited" }> {
  // A filled honeypot is reported as success so bots learn nothing.
  if (
    typeof input === "object" &&
    input !== null &&
    typeof (input as { website?: unknown }).website === "string" &&
    (input as { website: string }).website.length > 0
  ) {
    return { status: "submitted" };
  }

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

  return submitPlaceSuggestion(input);
}
