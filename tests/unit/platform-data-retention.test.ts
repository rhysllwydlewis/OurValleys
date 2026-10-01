import { describe, expect, it } from "vitest";
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
