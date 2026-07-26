import { describe, expect, it } from "vitest";
import { isModerationStatusFilter } from "./admin-moderation";

describe("isModerationStatusFilter", () => {
  it("accepts every known moderation status", () => {
    for (const status of [
      "draft",
      "pending_review",
      "published",
      "rejected",
      "suspended",
    ]) {
      expect(isModerationStatusFilter(status)).toBe(true);
    }
  });

  it("rejects values outside the declared set", () => {
    expect(isModerationStatusFilter("archived")).toBe(false);
    expect(isModerationStatusFilter("")).toBe(false);
    expect(isModerationStatusFilter("Published")).toBe(false);
  });
});
