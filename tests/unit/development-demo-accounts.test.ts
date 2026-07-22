import { describe, expect, it } from "vitest";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
  publicDemoAccount,
  publicDemoAccounts,
} from "../../src/lib/demo-account";

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

  it("routes each role to the protected journey it is intended to demonstrate", () => {
    expect(publicDemoAccount.returnTo).toBe("/account");
    expect(publicBusinessDemoAccount.returnTo).toBe(
      `/dashboard/business/${publicBusinessDemoAccount.businessId}`,
    );
    expect(publicAdminDemoAccount.returnTo).toBe("/admin");
  });

  it("limits the business demo to the same seeded fictional business", () => {
    expect(publicBusinessDemoAccount.businessId).toBe(
      publicDemoAccount.businessId,
    );
    expect(publicBusinessDemoAccount.userId).not.toBe(publicDemoAccount.userId);
    expect(publicBusinessDemoAccount.membershipId).not.toBe(
      publicDemoAccount.membershipId,
    );
  });

  it("records an explicit pre-launch removal warning for privileged demos", () => {
    expect(publicBusinessDemoAccount.notice).toContain(
      "removed before public launch",
    );
    expect(publicAdminDemoAccount.notice).toContain(
      "removed before public launch",
    );
  });
});
