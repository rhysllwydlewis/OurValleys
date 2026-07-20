import { z } from "zod";

export type RuntimeConfigurationInput = Readonly<
  Record<string, string | undefined>
>;

export type DatabaseConfigurationSource =
  "DATABASE_URL" | "DATABASE_PRIVATE_URL" | "POSTGRES_URL" | "PG_VARIABLES";

export type DatabaseEndpointClass =
  "loopback" | "railway-private" | "private-network" | "public-or-external";

export type ResolvedDatabaseConnection = {
  url: string;
  source: DatabaseConfigurationSource;
  endpointClass: DatabaseEndpointClass;
};

type PostgresPartsResult = {
  url?: string;
  incomplete: boolean;
};

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

const railwayMarkerNames = [
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_ENVIRONMENT_ID",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "RAILWAY_PUBLIC_DOMAIN",
] as const;

function configurationError(fields: string): Error {
  return new Error(`Invalid server environment configuration: ${fields}.`);
}

function parsePostgresUrl(value: string): string {
  const parsed = postgresUrlSchema.safeParse(value);
  if (!parsed.success) throw configurationError("DATABASE_URL");
  return parsed.data;
}

function isRailwayEnvironment(environment: RuntimeConfigurationInput): boolean {
  return railwayMarkerNames.some((name) => environment[name]?.trim());
}

function buildPostgresUrlFromParts(
  environment: RuntimeConfigurationInput,
): PostgresPartsResult {
  const host = environment.PGHOST?.trim();
  const port = environment.PGPORT?.trim() || "5432";
  const username = environment.PGUSER?.trim();
  const password = environment.PGPASSWORD;
  const database = environment.PGDATABASE?.trim();
  const suppliedParts = [host, username, password, database].filter(
    (value) => value !== undefined && value !== "",
  );

  if (suppliedParts.length === 0) return { incomplete: false };
  if (!host || !username || password === undefined || !database) {
    return { incomplete: true };
  }

  const url = new URL("postgresql://localhost");
  url.hostname = host;
  url.port = port;
  url.username = username;
  url.password = password;
  url.pathname = `/${database}`;
  return { url: parsePostgresUrl(url.toString()), incomplete: false };
}

function classifyDatabaseEndpoint(urlValue: string): DatabaseEndpointClass {
  const hostname = new URL(urlValue).hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    /^127\./u.test(hostname) ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return "loopback";
  }

  if (hostname.endsWith(".railway.internal")) return "railway-private";

  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^10\./u.test(hostname) ||
    /^192\.168\./u.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(hostname)
  ) {
    return "private-network";
  }

  return "public-or-external";
}

function assertSafeRailwayProductionTarget(
  environment: RuntimeConfigurationInput,
  endpointClass: DatabaseEndpointClass,
): void {
  if (
    environment.NODE_ENV === "production" &&
    isRailwayEnvironment(environment) &&
    endpointClass === "loopback"
  ) {
    throw configurationError(
      "DATABASE_URL must reference the Railway PostgreSQL service, not a loopback host",
    );
  }
}

export function resolveDatabaseConnection(
  environment: RuntimeConfigurationInput,
): ResolvedDatabaseConnection {
  const railwayEnvironment = isRailwayEnvironment(environment);
  const pgParts = buildPostgresUrlFromParts(environment);
  const candidates: Array<
    readonly [DatabaseConfigurationSource, string | undefined]
  > = railwayEnvironment
    ? [
        ["DATABASE_PRIVATE_URL", environment.DATABASE_PRIVATE_URL],
        ["PG_VARIABLES", pgParts.url],
        ["DATABASE_URL", environment.DATABASE_URL],
        ["POSTGRES_URL", environment.POSTGRES_URL],
      ]
    : [
        ["DATABASE_URL", environment.DATABASE_URL],
        ["DATABASE_PRIVATE_URL", environment.DATABASE_PRIVATE_URL],
        ["POSTGRES_URL", environment.POSTGRES_URL],
        ["PG_VARIABLES", pgParts.url],
      ];

  const selected = candidates.find(([, value]) => value?.trim());
  if (!selected) {
    if (pgParts.incomplete) {
      throw configurationError("PGHOST, PGUSER, PGPASSWORD, PGDATABASE");
    }
    throw configurationError("DATABASE_URL");
  }

  const [source, value] = selected;
  const url = parsePostgresUrl(value as string);
  const endpointClass = classifyDatabaseEndpoint(url);
  assertSafeRailwayProductionTarget(environment, endpointClass);

  return { url, source, endpointClass };
}

export function resolveDatabaseUrl(
  environment: RuntimeConfigurationInput,
): string {
  return resolveDatabaseConnection(environment).url;
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
