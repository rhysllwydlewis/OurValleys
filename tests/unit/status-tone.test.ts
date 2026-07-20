import { describe, expect, it } from "vitest";
import { statusLabel, statusTone } from "@/app/admin/status-tone";

describe("statusTone", () => {
  it("maps known lifecycle statuses to their expected tone", () => {
    expect(statusTone("pending_review")).toBe("toneWarning");
    expect(statusTone("published")).toBe("toneSuccess");
    expect(statusTone("rejected")).toBe("toneDanger");
    expect(statusTone("suspended")).toBe("toneDanger");
    expect(statusTone("draft")).toBe("toneNeutral");
  });

  it("falls back to neutral for an unrecognised status", () => {
    expect(statusTone("something-unexpected")).toBe("toneNeutral");
  });
});

describe("statusLabel", () => {
  it("title-cases each underscore-separated word", () => {
    expect(statusLabel("pending_review")).toBe("Pending Review");
    expect(statusLabel("published")).toBe("Published");
    expect(statusLabel("business_membership")).toBe("Business Membership");
  });
});
