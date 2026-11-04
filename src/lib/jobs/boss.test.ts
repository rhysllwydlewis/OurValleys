import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructorArgs: [] as unknown[],
}));

vi.mock("pg-boss", () => {
  class MockPgBoss {
    private handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

    constructor(options: unknown) {
      mocks.constructorArgs.push(options);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      (this.handlers[event] ??= []).push(handler);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      for (const handler of this.handlers[event] ?? []) handler(...args);
      return true;
    }
  }

  return { PgBoss: MockPgBoss };
});

import {
  createJobBoss,
  createJobQueues,
  defaultQueueOptions,
  jobQueues,
} from "./boss";

describe("jobQueues", () => {
  it("defines the known worker queue names", () => {
    expect(jobQueues).toEqual({
      scaffoldProof: "scaffold-proof",
      businessLifecycle: "business-lifecycle",
      enquiryRetention: "enquiry-retention",
      platformRetention: "platform-retention",
      placeDigest: "place-digest",
      ownerDigest: "owner-digest",
      eventReminders: "event-reminders",
      savedSearchAlerts: "saved-search-alerts",
      storageCleanup: "storage-cleanup",
      followedNotices: "followed-notices",
      scheduledUpdates: "scheduled-updates",
      scheduledStories: "scheduled-stories",
    });
  });
});

describe("createJobQueues", () => {
  it("creates every queue the worker uses, so none is missing at startup", async () => {
    const created: Array<[string, unknown]> = [];
    const boss = {
      createQueue: async (name: string, options: unknown) => {
        created.push([name, options]);
      },
    };

    await createJobQueues(
      boss as unknown as Parameters<typeof createJobQueues>[0],
    );

    expect(created.map(([name]) => name).sort()).toEqual(
      Object.values(jobQueues).sort(),
    );
    // The queue whose absence crashed the worker at startup.
    expect(created.map(([name]) => name)).toContain("scheduled-stories");
    expect(
      created.every(([, options]) => options === defaultQueueOptions),
    ).toBe(true);
  });
});

describe("defaultQueueOptions", () => {
  it("retries with backoff within a bounded retention window", () => {
    expect(defaultQueueOptions).toEqual({
      retryLimit: 3,
      retryBackoff: true,
      retentionSeconds: 60 * 60 * 24 * 14,
      deleteAfterSeconds: 60 * 60 * 24 * 7,
    });
  });
});

describe("createJobBoss", () => {
  it("configures the queue with the connection string and a stable application name", () => {
    mocks.constructorArgs.length = 0;

    createJobBoss("postgresql://example.test/ourvalleys");

    expect(mocks.constructorArgs).toEqual([
      {
        connectionString: "postgresql://example.test/ourvalleys",
        application_name: "ourvalleys-worker",
      },
    ]);
  });

  it("logs a structured error when the underlying queue emits an error", () => {
    const boss = createJobBoss("postgresql://example.test/ourvalleys");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    boss.emit("error", new Error("connection lost"));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        event: "job_queue_error",
        message: "connection lost",
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});
