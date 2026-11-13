import { NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  businessActivityTypes,
  hashVisitorSignal,
  recordBusinessActivity,
} from "@/modules/businesses/analytics";
import { normaliseClickSurface } from "@/modules/businesses/insights-model";
import { normaliseTrafficSource } from "@/modules/businesses/traffic-source";

/**
 * A visitor viewing and clicking around a site sends a handful of events a
 * minute; this is generous for a person and a ceiling for a script.
 */
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

const inputSchema = z.object({
  businessId: z.uuid(),
  eventType: z.enum(businessActivityTypes),
  source: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  const caller = [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("user-agent"),
  ]
    .filter(Boolean)
    .join("|");
  if (!limiter.allow(caller || "unknown")) {
    return NextResponse.json(
      { accepted: false },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const visitorHash = hashVisitorSignal(
    [forwarded, request.headers.get("user-agent")].filter(Boolean).join("|"),
  );
  await recordBusinessActivity({
    businessId: parsed.data.businessId,
    eventType: parsed.data.eventType,
    // A page view's source is where the visitor came from, so it is limited to
    // the known labels; click events keep the page area they were made from.
    source:
      parsed.data.eventType === "website_view"
        ? normaliseTrafficSource(parsed.data.source)
        : parsed.data.eventType === "search_appearance"
          ? parsed.data.source
          : normaliseClickSurface(parsed.data.source ?? ""),
    visitorHash,
  });
  return NextResponse.json({ accepted: true });
}
