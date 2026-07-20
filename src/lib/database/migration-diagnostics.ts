export const optionalDatabaseExtensions = [
  "postgis",
  "pg_trgm",
  "unaccent",
] as const;

export type OptionalDatabaseExtension =
  (typeof optionalDatabaseExtensions)[number];

export type DatabaseExtensionRecord = {
  name: string;
  installedVersion: string | null;
};

const connectionUrlPattern = /postgres(?:ql)?:\/\/[^\s@]+@/giu;
const passwordPattern = /(password\s*[=:]\s*)[^\s,;]+/giu;

export function redactDatabaseSecrets(value: string): string {
  return value
    .replace(connectionUrlPattern, "postgresql://[redacted]@")
    .replace(passwordPattern, "$1[redacted]");
}

export function describeDatabaseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown database migration error.";
  }

  const databaseError = error as Error & {
    code?: string;
    detail?: string;
    hint?: string;
    schema_name?: string;
    table_name?: string;
    constraint_name?: string;
    cause?: unknown;
  };
  const details = [
    databaseError.message,
    databaseError.code ? `code=${databaseError.code}` : undefined,
    databaseError.detail ? `detail=${databaseError.detail}` : undefined,
    databaseError.hint ? `hint=${databaseError.hint}` : undefined,
    databaseError.schema_name
      ? `schema=${databaseError.schema_name}`
      : undefined,
    databaseError.table_name ? `table=${databaseError.table_name}` : undefined,
    databaseError.constraint_name
      ? `constraint=${databaseError.constraint_name}`
      : undefined,
  ].filter((value): value is string => Boolean(value));

  if (databaseError.cause && databaseError.cause !== error) {
    details.push(`cause=${describeDatabaseError(databaseError.cause)}`);
  }

  return redactDatabaseSecrets(details.join("\n"));
}

export function summarizeOptionalExtensions(
  records: readonly DatabaseExtensionRecord[],
): Record<OptionalDatabaseExtension, "installed" | "available" | "unavailable"> {
  const recordsByName = new Map(records.map((record) => [record.name, record]));

  return Object.fromEntries(
    optionalDatabaseExtensions.map((name) => {
      const record = recordsByName.get(name);
      const status = record?.installedVersion
        ? "installed"
        : record
          ? "available"
          : "unavailable";
      return [name, status];
    }),
  ) as Record<
    OptionalDatabaseExtension,
    "installed" | "available" | "unavailable"
  >;
}
