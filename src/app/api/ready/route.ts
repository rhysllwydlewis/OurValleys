import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);
    return NextResponse.json({ status: "ready", database: "reachable" });
  } catch {
    return NextResponse.json(
      { status: "not_ready", database: "unavailable" },
      { status: 503 },
    );
  }
}
