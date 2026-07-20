import { z } from "zod";

export type RuntimeConfigurationInput = Readonly<
  Record<string, string | undefined>
>;

const postgresUrlSchema = z
  .string()
  .trim()
  .min(1)
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
        context.addIssue({
          code: "custom",
          message: "A PostgreSQL connection URL is required.",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "A valid PostgreSQL connection URL is required.",
      });
    }
  });

function configurationError(fields: string): Error {
  return new Error(`Invalid server environment configuration: ${fields}.`);
}

function parsePostgresUrl(value: string): string {
  const parsed = postgresUrlSchema.safeParse(value);
  if (!parsed.success) throw configurationError("DATABASE_URL");
  return parsed.data;
}

export function resolveDatabaseUrl(
  environment: RuntimeConfigurationInput,
): string {
  const directCandidates = [
    environment.DATABASE_URL,
    environment.DATABASE_PRIVATE_URL,
    environment.POSTGRES_URL,
  ];

  const directUrl = directCandidates.find((value) => value?.trim());
  if (directUrl) return parsePostgresUrl(directUrl);

  const host = environment.PGHOST?.trim();
  const port = environment.PGPORT?.trim() || "5432";
  const username = environment.PGUSER?.trim();
  const password = environment.PGPASSWORD;
  const database = environment.PGDATABASE?.trim();
  const suppliedParts = [host, username, password, database].filter(
    (value) => value !== undefined && value !== "",
  );

  if (suppliedParts.length === 0) throw configurationError("DATABASE_URL");
  if (!host || !username || password === undefined || !database) {
    throw configurationError("PGHOST, PGUSER, PGPASSWORD, PGDATABASE");
  }

  const url = new URL("postgresql://localhost");
  url.hostname = host;
  url.port = port;
  url.username = username;
  url.password = password;
  url.pathname = `/${database}`;
  return parsePostgresUrl(url.toString());
}

export function resolveServiceUrl(
  explicitValue: string | undefined,
  railwayPublicDomain: string | undefined,
  fieldName: string,
): string {
  const candidate = explicitValue?.trim()
    ? explicitValue
    : railwayPublicDomain?.trim()
      ? `https://${railwayPublicDomain.trim()}`
      : undefined;

  if (!candidate) throw configurationError(fieldName);

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported URL protocol.");
    }
    return url.origin;
  } catch {
    throw configurationError(fieldName);
  }
}
