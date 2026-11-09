import { NextResponse } from "next/server";
import { z } from "zod";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { contentKinds } from "@/modules/businesses/content-insights-model";
import { recordContentView } from "@/modules/businesses/content-insights";
import { normaliseTrafficSource } from "@/modules/businesses/traffic-source";

const inputSchema = z.object({
  kind: z.enum(contentKinds),
  itemId: z.uuid(),
  source: z.string().trim().max(40).optional(),
});

/** Anonymous page-open counter for one offer or event. */
export async function POST(request: Request) {
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
  const accepted = await recordContentView({
    kind: parsed.data.kind,
    itemId: parsed.data.itemId,
    source: normaliseTrafficSource(parsed.data.source),
    visitorSignal: [forwarded, request.headers.get("user-agent")]
      .filter(Boolean)
      .join("|"),
  });
  return NextResponse.json({ accepted });
}
