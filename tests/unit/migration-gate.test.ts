import { describe, expect, it, vi } from "vitest";
import {
  readExpectedMigrationCount,
  waitForMigrations,
} from "@/jobs/migration-gate";

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
  it("returns at once when every migration is applied", async () => {
    const result = await waitForMigrations({
      expected: 43,
      countApplied: async () => 43,
      ...clock(),
    });
    expect(result.applied).toBe(43);
    expect(result.waitedMs).toBe(0);
  });

  it("accepts a database that is ahead of this revision", async () => {
    const result = await waitForMigrations({
      expected: 43,
      countApplied: async () => 44,
      ...clock(),
    });
    expect(result.applied).toBe(44);
  });

  it("waits for a migration that lands while it polls", async () => {
    const counts = [41, 42, 43];
    const countApplied = vi.fn(async () => counts.shift() ?? 43);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await waitForMigrations({
      expected: 43,
      countApplied,
      intervalMs: 1000,
      ...clock(),
    });
    expect(countApplied).toHaveBeenCalledTimes(3);
    expect(result.waitedMs).toBe(2000);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("fails loudly instead of starting jobs on an old schema", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      waitForMigrations({
        expected: 43,
        countApplied: async () => 41,
        timeoutMs: 5000,
        intervalMs: 1000,
        ...clock(),
      }),
    ).rejects.toThrow("41 of 43 migrations");
    warn.mockRestore();
  });
});

describe("readExpectedMigrationCount", () => {
  it("counts the entries in the repository's Drizzle journal", () => {
    expect(readExpectedMigrationCount()).toBeGreaterThanOrEqual(43);
  });
});
