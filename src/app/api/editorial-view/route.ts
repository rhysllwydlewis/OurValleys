import { NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { recordEditorialView } from "@/modules/platform/editorial-insights";
import { editorialKinds } from "@/modules/platform/editorial-insights-model";

/** A visitor opens a handful of pages a minute; far more is a script. */
const limiter = createRateLimiter({ limit: 40, windowMs: 60_000 });

const inputSchema = z.object({
  kind: z.enum(editorialKinds),
  itemId: z.uuid(),
  source: z.string().trim().max(40).optional(),
});

/** Anonymous page-open counter for one place, guide or local story. */
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
  const accepted = await recordEditorialView({
    kind: parsed.data.kind,
    itemId: parsed.data.itemId,
    source: parsed.data.source,
    visitorSignal,
  });
  return NextResponse.json({ accepted });
}
