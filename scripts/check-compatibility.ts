import { sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../src/lib/auth";
import { db, databaseClient } from "../src/lib/database/client";
import { createJobBoss } from "../src/lib/jobs/boss";
import { loadCategorySeed, loadPlaceSeed } from "../src/modules/reference-data/loader";
import { publicBusinessRadiusCondition } from "../src/modules/search/sql";

async function main() {
  const [places, categories] = await Promise.all([loadPlaceSeed(), loadCategorySeed()]);
  const radiusSql = publicBusinessRadiusCondition({ longitude: -3.5, latitude: 51.66, radiusMetres: 10_000 });
  const boss = createJobBoss(process.env.DATABASE_URL!);
  const compatibility = {
    node: process.version,
    betterAuthHandlerAvailable: typeof auth.handler === "function",
    drizzleQueryBuilt: typeof db.select === "function" && sql`select 1` !== undefined,
    postgisConditionBuilt: radiusSql !== undefined,
    pgBossConstructed: typeof boss.start === "function",
    zodVersionWorks: z.string().min(1).safeParse("RCT").success,
    places: places.places.length,
    categories: categories.categories.length,
  };
  await databaseClient.end({ timeout: 1 });
  console.info(JSON.stringify(compatibility, null, 2));
}

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  await databaseClient.end({ timeout: 1 }).catch(() => undefined);
  process.exit(1);
});
