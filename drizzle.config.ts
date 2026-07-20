import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/lib/runtime-configuration";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/database/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabaseUrl(process.env),
  },
  strict: true,
  verbose: true,
});
