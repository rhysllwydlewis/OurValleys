import { z } from "zod";
import {
  resolveDatabaseUrl,
  resolveServiceUrl,
  type RuntimeConfigurationInput,
} from "./runtime-configuration";

const readinessFlag = z.enum(["true", "false"]).default("false");
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalNonEmptyString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);
const optionalEmailFrom = z.preprocess(
  emptyToUndefined,
  z.string().min(3).optional(),
);
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

const baseEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  OURVALLEYS_RELEASE_STAGE: z
    .enum(["development", "private_pilot", "public"])
    .default("development"),
});

const databaseEnvironmentSchema = baseEnvironmentSchema.extend({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  TEST_DATABASE_URL: z.string().min(1).optional(),
});

const serverEnvironmentSchema = databaseEnvironmentSchema
  .extend({
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
    BETTER_AUTH_URL: z.url(),
    NEXT_PUBLIC_SITE_URL: z.url(),
    RESEND_API_KEY: optionalNonEmptyString,
    EMAIL_FROM: optionalEmailFrom,
    R2_ACCOUNT_ID: optionalNonEmptyString,
    R2_ACCESS_KEY_ID: optionalNonEmptyString,
    R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
    R2_BUCKET: optionalNonEmptyString,
    R2_PUBLIC_BASE_URL: optionalUrl,
    PRIVILEGED_DEMOS_REMOVED: readinessFlag,
    POLICIES_APPROVED: readinessFlag,
    ADMIN_MFA_READY: readinessFlag,
  })
  .superRefine((value, context) => {
    if (value.OURVALLEYS_RELEASE_STAGE !== "public") return;

    const requiredFlags = [
      ["PRIVILEGED_DEMOS_REMOVED", value.PRIVILEGED_DEMOS_REMOVED],
      ["POLICIES_APPROVED", value.POLICIES_APPROVED],
      ["ADMIN_MFA_READY", value.ADMIN_MFA_READY],
    ] as const;
    for (const [field, flag] of requiredFlags) {
      if (flag !== "true") {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} must be true before public release.`,
        });
      }
    }

    const requiredServices = [
      ["RESEND_API_KEY", value.RESEND_API_KEY],
      ["EMAIL_FROM", value.EMAIL_FROM],
      ["R2_ACCOUNT_ID", value.R2_ACCOUNT_ID],
      ["R2_ACCESS_KEY_ID", value.R2_ACCESS_KEY_ID],
      ["R2_SECRET_ACCESS_KEY", value.R2_SECRET_ACCESS_KEY],
      ["R2_BUCKET", value.R2_BUCKET],
      ["R2_PUBLIC_BASE_URL", value.R2_PUBLIC_BASE_URL],
    ] as const;
    for (const [field, configured] of requiredServices) {
      if (!configured) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required for public release.`,
        });
      }
    }
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
