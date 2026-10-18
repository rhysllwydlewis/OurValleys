import { NextResponse } from "next/server";
import { z } from "zod";
import {
  businessActivityTypes,
  hashVisitorSignal,
  recordBusinessActivity,
} from "@/modules/businesses/analytics";
import { normaliseTrafficSource } from "@/modules/businesses/traffic-source";

const inputSchema = z.object({
  businessId: z.uuid(),
  eventType: z.enum(businessActivityTypes),
  source: z.string().trim().max(40).optional(),
});

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
        : parsed.data.source,
    visitorHash,
  });
  return NextResponse.json({ accepted: true });
}
