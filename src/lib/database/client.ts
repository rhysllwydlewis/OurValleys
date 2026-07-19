import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnvironment } from "@/lib/env";
import * as schema from "./schema";

const environment = getServerEnvironment();
const client = postgres(environment.DATABASE_URL, {
  max: environment.NODE_ENV === "production" ? 10 : 2,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema });
export { client as databaseClient };
