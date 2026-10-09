import { describe, expect, it, vi } from "vitest";
import {
  readMigrationJournal,
  waitForMigrations,
  type JournalEntry,
} from "@/jobs/migration-gate";

const journal: JournalEntry[] = [
  { tag: "0001_first", when: 100 },
  { tag: "0002_second", when: 300 },
  // Older timestamp than 0002, the shape that makes Drizzle skip a migration.
  { tag: "0003_out_of_order", when: 200 },
  { tag: "0004_latest", when: 400 },
];

function clock() {
  let time = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("waitForMigrations", () => {
  it("returns at once when the newest migration is recorded", async () => {
    const result = await waitForMigrations({
      journal,
      readApplied: async () => [100, 300, 200, 400],
      ...clock(),
    });
    expect(result.waitedMs).toBe(0);
    expect(result.skipped).toEqual([]);
  });

  it("accepts a database that skipped an out-of-order migration, and names it", async () => {
    // Drizzle never applies 0003 once 0002 (a later timestamp) is recorded, so
    // this database has three rows for four journal entries and must not wait.
    const result = await waitForMigrations({
      journal,
      readApplied: async () => [100, 300, 400],
      ...clock(),
    });
    expect(result.skipped).toEqual(["0003_out_of_order"]);
  });

  it("does not report a skipped migration that a later one repaired", async () => {
    const result = await waitForMigrations({
      journal,
      readApplied: async () => [100, 300, 400],
      repaired: ["0003_out_of_order"],
      ...clock(),
    });
    expect(result.skipped).toEqual([]);
  });

  it("accepts a database that is ahead of this revision", async () => {
    const result = await waitForMigrations({
      journal,
      readApplied: async () => [100, 200, 300, 400, 500],
      ...clock(),
    });
    expect(result.skipped).toEqual([]);
  });

  it("waits for a migration that lands while it polls", async () => {
    const reads = [[100], [100, 300], [100, 300, 200, 400]];
    const readApplied = vi.fn(async () => reads.shift() ?? [400]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await waitForMigrations({
      journal,
      readApplied,
      intervalMs: 1000,
      ...clock(),
    });
    expect(readApplied).toHaveBeenCalledTimes(3);
    expect(result.waitedMs).toBe(2000);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("waits for an empty database, then fails loudly instead of starting jobs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      waitForMigrations({
        journal,
        readApplied: async () => [],
        timeoutMs: 5000,
        intervalMs: 1000,
        ...clock(),
      }),
    ).rejects.toThrow("behind this revision's migrations");
    warn.mockRestore();
  });
});

describe("the repository's migration journal", () => {
  const entries = readMigrationJournal();

  it("has entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(44);
  });

  it("gives every migration after 0017 a timestamp newer than all before it", () => {
    // Drizzle applies a migration only if its timestamp is later than the
    // newest one already recorded. A new migration with an older (or equal)
    // timestamp would be silently skipped on every database that is already
    // migrated, as 0016 and 0017 were. 0016 and 0017 are the known exceptions.
    const offenders: string[] = [];
    let newestSoFar = 0;
    entries.forEach((entry, index) => {
      if (index > 17 && entry.when <= newestSoFar) offenders.push(entry.tag);
      newestSoFar = Math.max(newestSoFar, entry.when);
    });
    expect(offenders).toEqual([]);
  });

  it("lists the known out-of-order migrations, so the guard is not blind to them", () => {
    const outOfOrder = entries
      .filter(
        (entry, index) =>
          index > 0 &&
          entry.when <=
            Math.max(...entries.slice(0, index).map((earlier) => earlier.when)),
      )
      .map((entry) => entry.tag);
    expect(outOfOrder).toEqual([
      "0016_fearless_mandarin",
      "0017_add_business_invitations",
    ]);
  });
});
