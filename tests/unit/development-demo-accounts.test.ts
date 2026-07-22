import { describe, expect, it } from "vitest";
import {
  getPublicDemoAccountByEmail,
  isPublicDemoEmail,
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
  publicDemoAccount,
  publicDemoAccounts,
} from "../../src/lib/demo-account";
import {
  canUseBusinessAppearanceTools,
  canUseBusinessOperationsTools,
} from "../../src/lib/public-demo-policy";

describe("public development demo accounts", () => {
  it("keeps every credential unmistakably public and fictional", () => {
    expect(publicDemoAccounts).toHaveLength(3);

    for (const account of publicDemoAccounts) {
      expect(account.email).toMatch(/\.example$/);
      expect(account.password).toContain("PUBLIC-");
      expect(account.notice.toLowerCase()).toContain("public");
    }

    expect(new Set(publicDemoAccounts.map(({ email }) => email)).size).toBe(3);
    expect(
      new Set(publicDemoAccounts.map(({ password }) => password)).size,
    ).toBe(3);
  });

  it("recognises and resolves every public demo email", () => {
    for (const account of publicDemoAccounts) {
      expect(isPublicDemoEmail(account.email)).toBe(true);
      expect(isPublicDemoEmail(account.email.toUpperCase())).toBe(true);
      expect(getPublicDemoAccountByEmail(account.email)).toEqual(account);
      expect(
        getPublicDemoAccountByEmail(` ${account.email.toUpperCase()} `),
      ).toEqual(account);
    }

    expect(isPublicDemoEmail("person@example.test")).toBe(false);
    expect(getPublicDemoAccountByEmail("person@example.test")).toBeNull();
    expect(isPublicDemoEmail(null)).toBe(false);
  });

  it("routes each role to the protected journey it is intended to demonstrate", () => {
    expect(publicDemoAccount.returnTo).toBe("/account");
    expect(publicBusinessDemoAccount.returnTo).toBe(
      `/dashboard/business/${publicBusinessDemoAccount.businessId}`,
    );
    expect(publicAdminDemoAccount.returnTo).toBe("/admin");
  });

  it("uses a dedicated public owner identity for the seeded business", () => {
    expect(publicBusinessDemoAccount.businessId).toBe(
      publicDemoAccount.businessId,
    );
    expect(publicBusinessDemoAccount.email).toBe(
      "demo.owner@ourvalleys.example",
    );
    expect(publicBusinessDemoAccount.email).not.toBe(publicDemoAccount.email);
    expect("userId" in publicBusinessDemoAccount).toBe(false);
    expect("membershipId" in publicBusinessDemoAccount).toBe(false);
  });

  it("keeps private appearance and media tools unavailable to shared demos", () => {
    for (const account of publicDemoAccounts) {
      expect(canUseBusinessAppearanceTools(account.email)).toBe(false);
      expect(canUseBusinessAppearanceTools(account.email.toUpperCase())).toBe(
        false,
      );
      expect(canUseBusinessOperationsTools(account.email)).toBe(false);
      expect(canUseBusinessOperationsTools(account.email.toUpperCase())).toBe(
        false,
      );
    }

    expect(canUseBusinessAppearanceTools("owner@example.test")).toBe(true);
    expect(canUseBusinessAppearanceTools(null)).toBe(true);
    expect(canUseBusinessOperationsTools("owner@example.test")).toBe(true);
    expect(canUseBusinessOperationsTools(null)).toBe(true);
  });

  it("discloses privileged demo restrictions and the pre-launch gate", () => {
    expect(publicBusinessDemoAccount.notice).toContain(
      "member management and other business operations are disabled",
    );
    expect(publicAdminDemoAccount.notice).toContain(
      "Private records, administrative mutations and account settings are disabled",
    );
    expect(publicBusinessDemoAccount.notice).toContain(
      "removed before public launch",
    );
    expect(publicAdminDemoAccount.notice).toContain(
      "removed before public launch",
    );
  });
});
