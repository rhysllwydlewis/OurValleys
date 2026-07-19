import { sql } from "drizzle-orm";
import { db, databaseClient } from "../src/lib/database/client";
import { scaffoldProof } from "../src/lib/database/schema/scaffold";

async function main() {
  await db
    .insert(scaffoldProof)
    .values({
      proofKey: "database",
      proofValue: "PostgreSQL and Drizzle are connected.",
    })
    .onConflictDoUpdate({
      target: scaffoldProof.proofKey,
      set: {
        proofValue: "PostgreSQL and Drizzle are connected.",
        updatedAt: sql`now()`,
      },
    });

  console.info(JSON.stringify({ event: "seed_complete", records: 1 }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await databaseClient.end({ timeout: 5 });
  });
