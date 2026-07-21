import { NextResponse } from "next/server";
import { z } from "zod";
import {
  businessActivityTypes,
  hashVisitorSignal,
  recordBusinessActivity,
} from "@/modules/businesses/analytics";

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
    source: parsed.data.source,
    visitorHash,
  });
  return NextResponse.json({ accepted: true });
}
