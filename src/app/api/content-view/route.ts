import { NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { contentKinds } from "@/modules/businesses/content-insights-model";
import { recordContentView } from "@/modules/businesses/content-insights";
import { normaliseTrafficSource } from "@/modules/businesses/traffic-source";

/** A visitor opens a handful of pages a minute; far more is a script. */
const limiter = createRateLimiter({ limit: 40, windowMs: 60_000 });

const inputSchema = z.object({
  kind: z.enum(contentKinds),
  itemId: z.uuid(),
  /** Catalogue entries are found through their business. */
  businessSlug: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().max(40).optional(),
});

/** Anonymous page-open counter for one offer, event, update or catalogue entry. */
export async function POST(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const visitorSignal = [forwarded, request.headers.get("user-agent")]
    .filter(Boolean)
    .join("|");
  if (!limiter.allow(visitorSignal || "unknown")) {
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
  if (parsed.data.kind === "catalogue" && !parsed.data.businessSlug) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }
  const accepted = await recordContentView({
    kind: parsed.data.kind,
    itemId: parsed.data.itemId,
    ...(parsed.data.kind === "catalogue"
      ? { businessSlug: parsed.data.businessSlug }
      : {}),
    source: normaliseTrafficSource(parsed.data.source),
    visitorSignal,
  });
  return NextResponse.json({ accepted });
}
