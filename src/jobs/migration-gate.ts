import { readFileSync } from "node:fs";
import { getDatabaseClient } from "@/lib/database/client";

type MigrationGateOptions = {
  /** Number of migrations this revision of the code expects to be applied. */
  expected: number;
  /** Reads how many migrations the database has applied. */
  countApplied: () => Promise<number>;
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type MigrationGateResult = { applied: number; waitedMs: number };

const defaultTimeoutMs = 10 * 60 * 1000;
const defaultIntervalMs = 10 * 1000;

/**
 * Railway does not order deployments of two services built from one push, so
 * the worker can start before the web service's pre-deploy migration has
 * finished. Jobs run against an older schema could fail or, worse, act on it,
 * so the worker waits here until the database has applied at least as many
 * migrations as this revision ships, and gives up loudly if it never does.
 */
export async function waitForMigrations(
  options: MigrationGateOptions,
): Promise<MigrationGateResult> {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const intervalMs = options.intervalMs ?? defaultIntervalMs;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const startedAt = now();

  for (;;) {
    const applied = await options.countApplied();
    if (applied >= options.expected) {
      return { applied, waitedMs: now() - startedAt };
    }
    if (now() - startedAt + intervalMs > timeoutMs) {
      throw new Error(
        `Database has ${applied} of ${options.expected} migrations applied after waiting ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "worker_waiting_for_migrations",
        applied,
        expected: options.expected,
      }),
    );
    await sleep(intervalMs);
  }
}

/** Migrations shipped with this revision, from the Drizzle journal. */
export function readExpectedMigrationCount(
  journalPath = "./drizzle/meta/_journal.json",
): number {
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: unknown[];
  };
  return journal.entries?.length ?? 0;
}

/** Migrations the database has applied; zero before the first migration. */
export async function countAppliedMigrations(): Promise<number> {
  try {
    const rows = await getDatabaseClient()<Array<{ count: number }>>`
      select count(*)::int as count from drizzle.__drizzle_migrations
    `;
    return rows[0]?.count ?? 0;
  } catch (error) {
    // 42P01/3F000: the migrations table or schema does not exist yet.
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "3F000") return 0;
    throw error;
  }
}
