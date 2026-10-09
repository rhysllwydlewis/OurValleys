import { readFileSync } from "node:fs";
import { getDatabaseClient } from "@/lib/database/client";

export type JournalEntry = { tag: string; when: number };

type MigrationGateOptions = {
  /** Migrations this revision ships, from the Drizzle journal. */
  journal: readonly JournalEntry[];
  /** Reads the `created_at` timestamp of every migration the database applied. */
  readApplied: () => Promise<readonly number[]>;
  /** Skipped migrations a later migration has already repaired. */
  repaired?: readonly string[];
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type MigrationGateResult = {
  waitedMs: number;
  /**
   * Journal migrations the database has no record of although it is up to
   * date. Drizzle skips a migration whose timestamp is older than the newest
   * one already applied, so these were never run.
   */
  skipped: string[];
};

const defaultTimeoutMs = 10 * 60 * 1000;
const defaultIntervalMs = 10 * 1000;

function newest(values: readonly number[]): number {
  return values.reduce((latest, value) => Math.max(latest, value), 0);
}

/**
 * Railway does not order deployments of two services built from one push, so
 * the worker can start before the web service's pre-deploy migration has
 * finished. Jobs run against an older schema could fail or, worse, act on it,
 * so the worker waits here until the database is as new as this revision.
 *
 * "As new as" follows the migrator's own rule: it applies a migration only if
 * its journal timestamp is later than the newest one recorded, so the database
 * is up to date once it has recorded this revision's newest migration. Counting
 * rows would be wrong, because a database that skipped migrations (see
 * `skipped`) has fewer rows than the journal has entries and would wait forever.
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
  const expected = newest(options.journal.map((entry) => entry.when));

  for (;;) {
    const applied = await options.readApplied();
    if (newest(applied) >= expected) {
      const recorded = new Set(applied);
      return {
        waitedMs: now() - startedAt,
        skipped: options.journal
          .filter((entry) => !recorded.has(entry.when))
          .map((entry) => entry.tag)
          .filter((tag) => !options.repaired?.includes(tag)),
      };
    }
    if (now() - startedAt + intervalMs > timeoutMs) {
      throw new Error(
        `Database is behind this revision's migrations (${applied.length} applied, newest ${newest(applied)}, expected ${expected}) after waiting ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "worker_waiting_for_migrations",
        applied: applied.length,
        newestApplied: newest(applied),
        expectedNewest: expected,
      }),
    );
    await sleep(intervalMs);
  }
}

/** Migrations shipped with this revision, from the Drizzle journal. */
export function readMigrationJournal(
  journalPath = "./drizzle/meta/_journal.json",
): JournalEntry[] {
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ tag: string; when: number }>;
  };
  return (journal.entries ?? []).map(({ tag, when }) => ({ tag, when }));
}

/** Timestamps of the migrations the database applied; empty before the first. */
export async function readAppliedMigrations(): Promise<number[]> {
  try {
    const rows = await getDatabaseClient()<Array<{ created_at: string }>>`
      select created_at from drizzle.__drizzle_migrations
    `;
    return rows.map((row) => Number(row.created_at));
  } catch (error) {
    // 42P01/3F000: the migrations table or schema does not exist yet.
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "3F000") return [];
    throw error;
  }
}
