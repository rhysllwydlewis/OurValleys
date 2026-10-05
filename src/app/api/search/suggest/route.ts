import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { listSearchSuggestions } from "@/modules/businesses/search-suggestions";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export async function GET(request: Request) {
  if (!limiter.allow(clientKey(request))) {
    return NextResponse.json(
      { suggestions: [] },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const q = new URL(request.url).searchParams.get("q");
  const suggestions = await listSearchSuggestions(q);
  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
