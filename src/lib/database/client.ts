import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseEnvironment } from "@/lib/env";
import * as schema from "./schema";

function createDatabaseState() {
  const environment = getDatabaseEnvironment();
  const client = postgres(environment.DATABASE_URL, {
    max: environment.NODE_ENV === "production" ? 10 : 2,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return {
    client,
    database: drizzle(client, { schema }),
  };
}

let databaseState: ReturnType<typeof createDatabaseState> | undefined;

function getDatabaseState(): ReturnType<typeof createDatabaseState> {
  databaseState ??= createDatabaseState();
  return databaseState;
}

export function getDatabase() {
  return getDatabaseState().database;
}

export function getDatabaseClient() {
  return getDatabaseState().client;
}

export async function closeDatabase(timeout = 5): Promise<void> {
  if (!databaseState) {
    return;
  }

  const state = databaseState;
  databaseState = undefined;
  await state.client.end({ timeout });
}
