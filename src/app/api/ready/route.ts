import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);
    const auth = getAuth();
    if (typeof auth.handler !== "function") {
      throw new Error("Authentication handler is unavailable.");
    }

    return NextResponse.json({
      status: "ready",
      database: "reachable",
      authentication: "configured",
    });
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        database: "unavailable_or_unconfigured",
        authentication: "unavailable_or_unconfigured",
      },
      { status: 503 },
    );
  }
}
