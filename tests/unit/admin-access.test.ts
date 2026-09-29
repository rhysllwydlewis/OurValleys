import { describe, expect, it } from "vitest";
import {
  canUseAdminMutations,
  hasAdminMfa,
  isPlatformAdmin,
} from "@/modules/identity/admin-access";
import { publicAdminDemoAccount } from "@/lib/demo-account";

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

describe("canUseAdminMutations", () => {
  it("allows a private active platform administrator", () => {
    expect(
      canUseAdminMutations({
        role: "admin",
        banned: false,
        email: "named.admin@example.test",
        twoFactorEnabled: true,
      }),
    ).toBe(true);
  });

  it("denies a private administrator who has not enrolled two-step verification", () => {
    for (const twoFactorEnabled of [false, null, undefined]) {
      expect(
        canUseAdminMutations({
          role: "admin",
          banned: false,
          email: "named.admin@example.test",
          twoFactorEnabled,
        }),
      ).toBe(false);
    }
  });

  it("keeps the intentionally public admin demonstration read-only", () => {
    expect(
      isPlatformAdmin({
        role: "admin",
        banned: false,
        email: publicAdminDemoAccount.email,
      }),
    ).toBe(true);
    expect(
      canUseAdminMutations({
        role: "admin",
        banned: false,
        email: publicAdminDemoAccount.email,
      }),
    ).toBe(false);
  });
});

describe("hasAdminMfa", () => {
  it("requires enrolment for private accounts", () => {
    expect(hasAdminMfa(null)).toBe(false);
    expect(hasAdminMfa({ email: "a@example.test" })).toBe(false);
    expect(
      hasAdminMfa({ email: "a@example.test", twoFactorEnabled: true }),
    ).toBe(true);
  });

  it("exempts the read-only public admin demonstration", () => {
    expect(hasAdminMfa({ email: publicAdminDemoAccount.email })).toBe(true);
  });
});
