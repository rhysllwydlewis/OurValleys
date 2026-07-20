import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/client";

export const dynamic = "force-dynamic";

type ComponentStatus = "configured" | "reachable" | "unavailable";

export async function GET() {
  let database: ComponentStatus = "unavailable";
  let authentication: ComponentStatus = "unavailable";

  try {
    await getDatabase().execute(sql`select 1`);
    database = "reachable";
  } catch {
    // Readiness responses deliberately avoid exposing database error details.
  }

  try {
    const auth = getAuth();
    if (typeof auth.handler === "function") {
      authentication = "configured";
    }
  } catch {
    // Runtime configuration is validated before deployment; keep this fail-closed.
  }

  const ready = database === "reachable" && authentication === "configured";

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      database,
      authentication,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
