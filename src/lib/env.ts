import { z } from "zod";

const booleanEnvironmentValue = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const serverEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: z.url(),
  AUTH_EMAIL_PASSWORD_ENABLED: booleanEnvironmentValue,
  NEXT_PUBLIC_SITE_URL: z.url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  const parsed = serverEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .join(", ");
    throw new Error(`Invalid server environment configuration: ${fields}.`);
  }
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}
