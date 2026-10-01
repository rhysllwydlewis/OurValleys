import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_EVENT_RETENTION_MONTHS,
  EXPIRED_SESSION_GRACE_DAYS,
  EXPIRED_VERIFICATION_GRACE_DAYS,
  computeRetentionCutoffs,
} from "@/modules/platform/data-retention";

describe("computeRetentionCutoffs", () => {
  const now = new Date("2026-09-28T12:00:00.000Z");

  it("puts the session and verification cutoffs the grace period in the past", () => {
    const { sessionCutoff, verificationCutoff } = computeRetentionCutoffs(now);
    expect(now.getTime() - sessionCutoff.getTime()).toBe(
      EXPIRED_SESSION_GRACE_DAYS * 86_400_000,
    );
    expect(now.getTime() - verificationCutoff.getTime()).toBe(
      EXPIRED_VERIFICATION_GRACE_DAYS * 86_400_000,
    );
  });

  it("keeps activity events for the documented number of months", () => {
    const { activityCutoff } = computeRetentionCutoffs(now);
    expect(ACTIVITY_EVENT_RETENTION_MONTHS).toBeGreaterThanOrEqual(24);
    expect(activityCutoff.toISOString()).toBe("2024-07-28T12:00:00.000Z");
  });

  it("does not mutate the reference date", () => {
    const copy = new Date(now);
    computeRetentionCutoffs(now);
    expect(now.getTime()).toBe(copy.getTime());
  });
});

describe("purgePlatformData failure reporting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/database/client");
  });

  it("lists every purge that threw and logs each at error level", async () => {
    vi.resetModules();
    vi.doMock("@/lib/database/client", () => ({
      getDatabase: () => ({
        delete: () => {
          throw new Error("connection refused");
        },
      }),
    }));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const retention = await import("@/modules/platform/data-retention");

    const result = await retention.purgePlatformData(new Date());

    expect(result.failures).toEqual([
      "sessions",
      "verifications",
      "activityEvents",
      "openingExceptions",
    ]);
    expect(
      result.sessions +
        result.verifications +
        result.activityEvents +
        result.openingExceptions,
    ).toBe(0);
    expect(errorLog).toHaveBeenCalledTimes(4);
    expect(String(errorLog.mock.calls[0]?.[0])).toContain(
      "platform_retention_purge_failed",
    );
  });
});
