import { describe, expect, it } from "vitest";
import { canActOnBusiness } from "./permissions";

const activeOwner = { userId: "user-a", businessId: "business-a", role: "owner" as const, revokedAt: null };

describe("canActOnBusiness", () => {
  it("permits an active owner for their own business", () => {
    expect(canActOnBusiness(activeOwner, "business-a", "business:publish")).toBe(true);
  });
  it("denies a cross-tenant request even when the role normally has permission", () => {
    expect(canActOnBusiness(activeOwner, "business-b", "business:publish")).toBe(false);
  });
  it("denies revoked memberships", () => {
    expect(canActOnBusiness({ ...activeOwner, revokedAt: new Date() }, "business-a", "business:read")).toBe(false);
  });
  it("keeps editors from publishing", () => {
    expect(canActOnBusiness({ ...activeOwner, role: "editor" }, "business-a", "business:publish")).toBe(false);
  });
});
