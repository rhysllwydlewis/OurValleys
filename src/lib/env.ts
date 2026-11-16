import { z } from "zod";
import { isMediaStorageComplete } from "./media-config";
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
  // Reviews stay off in every stage until the owner decides to enable them.
  OURVALLEYS_REVIEWS_ENABLED: z.enum(["true", "false"]).default("false"),
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
    POSTMARK_API_KEY: optionalNonEmptyString,
    RESEND_API_KEY: optionalNonEmptyString,
    EMAIL_FROM: optionalEmailFrom,
    // Private S3-compatible bucket, normally a Railway Bucket (media-config.ts).
    MEDIA_S3_ENDPOINT: optionalUrl,
    MEDIA_S3_BUCKET: optionalNonEmptyString,
    MEDIA_S3_REGION: optionalNonEmptyString,
    MEDIA_S3_ACCESS_KEY_ID: optionalNonEmptyString,
    MEDIA_S3_SECRET_ACCESS_KEY: optionalNonEmptyString,
    MEDIA_S3_PATH_STYLE: optionalNonEmptyString,
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

    if (!value.POSTMARK_API_KEY && !value.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["POSTMARK_API_KEY"],
        message:
          "POSTMARK_API_KEY (or RESEND_API_KEY) is required for public release.",
      });
    }

    if (!value.EMAIL_FROM) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: "EMAIL_FROM is required for public release.",
      });
    }

    // Uploaded pictures need somewhere to live. Either a complete private
    // bucket (MEDIA_S3_*) or a complete Cloudflare R2 set (R2_*, including its
    // public host) satisfies the gate; anything less fails the release.
    if (!isMediaStorageComplete(value)) {
      context.addIssue({
        code: "custom",
        path: ["MEDIA_S3_BUCKET"],
        message:
          "Media storage is required for public release: set MEDIA_S3_ENDPOINT, MEDIA_S3_BUCKET, MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY (or the complete R2_* set).",
      });
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
