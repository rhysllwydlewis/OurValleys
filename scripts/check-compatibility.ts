import { sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../src/lib/auth";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { createJobBoss } from "../src/lib/jobs/boss";

async function main() {
  const database = getDatabase();
  const auth = getAuth();
  const boss = createJobBoss(process.env.DATABASE_URL ?? "");
  const compatibility = {
    node: process.version,
    betterAuthHandlerAvailable: typeof auth.handler === "function",
    drizzleQueryBuilt:
      typeof database.select === "function" && sql`select 1` !== undefined,
    pgBossConstructed: typeof boss.start === "function",
    zodValidationWorks: z.string().min(1).safeParse("RCT").success,
  };

  if (Object.values(compatibility).some((value) => value === false)) {
    throw new Error("One or more compatibility checks failed.");
  }

  console.info(JSON.stringify(compatibility, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase(1);
  });
