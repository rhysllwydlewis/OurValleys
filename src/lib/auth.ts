import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { getDatabase } from "@/lib/database/client";
import * as authSchema from "@/lib/database/schema/auth";
import { getServerEnvironment } from "@/lib/env";
import { resolveTrustedOrigins } from "@/lib/runtime-configuration";

function createAuth() {
  const environment = getServerEnvironment();

  return betterAuth({
    appName: "OurValleys",
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: resolveTrustedOrigins(process.env),
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: authSchema,
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    // nextCookies() must stay last so it can intercept Set-Cookie headers
    // from every other plugin's endpoints when called from server actions.
    plugins: [adminPlugin(), nextCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth();
  return authInstance;
}
