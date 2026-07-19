import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/database/client";
import * as authSchema from "@/lib/database/schema/auth";
import { getServerEnvironment } from "@/lib/env";

const environment = getServerEnvironment();

export const auth = betterAuth({
  appName: "OurValleys",
  baseURL: environment.BETTER_AUTH_URL,
  secret: environment.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
