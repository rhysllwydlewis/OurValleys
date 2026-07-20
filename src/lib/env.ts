import { z } from "zod";
import {
  resolveDatabaseUrl,
  resolveServiceUrl,
  type RuntimeConfigurationInput,
} from "./runtime-configuration";

const baseEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const databaseEnvironmentSchema = baseEnvironmentSchema.extend({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  TEST_DATABASE_URL: z.string().min(1).optional(),
});

const serverEnvironmentSchema = databaseEnvironmentSchema.extend({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type EnvironmentInput = RuntimeConfigurationInput;

function formatEnvironmentError(error: z.ZodError): Error {
  const fields = error.issues
    .map((issue) => issue.path.join(".") || "environment")
    .join(", ");
  return new Error(`Invalid server environment configuration: ${fields}.`);
}

export function parseDatabaseEnvironment(
  environment: EnvironmentInput,
): DatabaseEnvironment {
  const parsed = databaseEnvironmentSchema.safeParse({
    ...environment,
    DATABASE_URL: resolveDatabaseUrl(environment),
  });

  if (!parsed.success) throw formatEnvironmentError(parsed.error);
  return parsed.data;
}

export function parseServerEnvironment(
  environment: EnvironmentInput,
): ServerEnvironment {
  const siteUrl = resolveServiceUrl(
    environment.NEXT_PUBLIC_SITE_URL,
    environment.RAILWAY_PUBLIC_DOMAIN,
    "NEXT_PUBLIC_SITE_URL",
  );
  const parsed = serverEnvironmentSchema.safeParse({
    ...environment,
    DATABASE_URL: resolveDatabaseUrl(environment),
    NEXT_PUBLIC_SITE_URL: siteUrl,
    BETTER_AUTH_URL: resolveServiceUrl(
      environment.BETTER_AUTH_URL ?? siteUrl,
      environment.RAILWAY_PUBLIC_DOMAIN,
      "BETTER_AUTH_URL",
    ),
  });

  if (!parsed.success) throw formatEnvironmentError(parsed.error);
  return parsed.data;
}

let cachedDatabaseEnvironment: DatabaseEnvironment | undefined;
let cachedServerEnvironment: ServerEnvironment | undefined;

export function getDatabaseEnvironment(): DatabaseEnvironment {
  cachedDatabaseEnvironment ??= parseDatabaseEnvironment(process.env);
  return cachedDatabaseEnvironment;
}

export function getServerEnvironment(): ServerEnvironment {
  cachedServerEnvironment ??= parseServerEnvironment(process.env);
  return cachedServerEnvironment;
}
