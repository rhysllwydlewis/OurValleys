import { migrate } from "drizzle-orm/postgres-js/migrator";
import {
  closeDatabase,
  getDatabase,
  getDatabaseClient,
} from "../src/lib/database/client";
import {
  describeDatabaseError,
  optionalDatabaseExtensions,
  summarizeOptionalExtensions,
  type DatabaseExtensionRecord,
} from "../src/lib/database/migration-diagnostics";

async function reportDatabaseCapabilities(): Promise<void> {
  try {
    const client = getDatabaseClient();
    const records = await client<
      Array<{ name: string; installed_version: string | null }>
    >`
      select name, installed_version
      from pg_available_extensions
      where name in ('postgis', 'pg_trgm', 'unaccent')
      order by name
    `;
    const normalizedRecords: DatabaseExtensionRecord[] = records.map(
      (record) => ({
        name: record.name,
        installedVersion: record.installed_version,
      }),
    );
    const summary = summarizeOptionalExtensions(normalizedRecords);

    console.info(
      JSON.stringify(
        {
          database: "connected",
          optionalExtensions: summary,
          spatialFeaturesReady: summary.postgis === "installed",
        },
        null,
        2,
      ),
    );

    const unavailable = optionalDatabaseExtensions.filter(
      (name) => summary[name] === "unavailable",
    );
    if (unavailable.length > 0) {
      console.warn(
        `Optional PostgreSQL extensions unavailable: ${unavailable.join(
          ", ",
        )}. Current non-spatial migrations will continue; spatial features must remain disabled until PostGIS is installed.`,
      );
    }
  } catch (error: unknown) {
    console.warn(
      `Unable to inspect optional PostgreSQL extensions before migration. Continuing with committed migrations.\n${describeDatabaseError(
        error,
      )}`,
    );
  }
}

async function main(): Promise<void> {
  await reportDatabaseCapabilities();
  await migrate(getDatabase(), { migrationsFolder: "./drizzle" });
  console.info("Database migrations applied successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Database migration failed.");
    console.error(describeDatabaseError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase(1);
  });
