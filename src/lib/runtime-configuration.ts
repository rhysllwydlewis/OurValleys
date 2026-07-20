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

function safeOrigin(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/**
 * Better Auth trusts only the origins it is explicitly given, resolved once
 * at startup from `baseURL`. An explicit BETTER_AUTH_URL that is stale or
 * subtly wrong silently rejects every sign-in with INVALID_ORIGIN while
 * reads keep working, which is easy to miss until a real user hits it. Union
 * in the resolved NEXT_PUBLIC_SITE_URL and the origin Railway itself reports
 * as public so a mismatched explicit value cannot orphan production traffic.
 */
export function resolveTrustedOrigins(
  environment: RuntimeConfigurationInput,
): string[] {
  const origins = new Set<string>();

  for (const origin of [
    safeOrigin(environment.BETTER_AUTH_URL),
    safeOrigin(environment.NEXT_PUBLIC_SITE_URL),
  ]) {
    if (origin) origins.add(origin);
  }

  const railwayPublicDomain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayPublicDomain) origins.add(`https://${railwayPublicDomain}`);

  return Array.from(origins);
}

/**
 * Detects a Railway deployment whose explicit BETTER_AUTH_URL origin does
 * not match the origin Railway itself is serving. Non-fatal: an explicit
 * value legitimately differs when a custom domain is in front of the
 * service, so this only reports the mismatch for operator visibility rather
 * than blocking deploy.
 */
export function detectStaleBetterAuthUrl(
  environment: RuntimeConfigurationInput,
): { configured: string; railwayPublicOrigin: string } | null {
  const railwayPublicDomain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  const explicitBetterAuthUrl = environment.BETTER_AUTH_URL?.trim();
  if (!railwayPublicDomain || !explicitBetterAuthUrl) return null;

  const configuredOrigin = safeOrigin(explicitBetterAuthUrl);
  const railwayPublicOrigin = `https://${railwayPublicDomain}`;
  if (!configuredOrigin || configuredOrigin === railwayPublicOrigin) {
    return null;
  }

  return { configured: configuredOrigin, railwayPublicOrigin };
}
