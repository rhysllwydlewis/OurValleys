import { describe, expect, it } from "vitest";
import { isPlatformAdmin } from "@/modules/identity/admin-access";

describe("isPlatformAdmin", () => {
  it("returns false for a null session user", () => {
    expect(isPlatformAdmin(null)).toBe(false);
  });

  it("returns false for a regular user role", () => {
    expect(isPlatformAdmin({ role: "user", banned: false })).toBe(false);
  });

  it("returns true for an active admin", () => {
    expect(isPlatformAdmin({ role: "admin", banned: false })).toBe(true);
  });

  it("returns false for a banned admin, even though the role is admin", () => {
    expect(isPlatformAdmin({ role: "admin", banned: true })).toBe(false);
  });

  it("returns false when role is missing or an unrecognised value", () => {
    expect(isPlatformAdmin({ banned: false })).toBe(false);
    expect(isPlatformAdmin({ role: "super-admin", banned: false })).toBe(false);
  });
});
