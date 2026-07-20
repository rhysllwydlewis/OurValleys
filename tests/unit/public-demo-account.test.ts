import { describe, expect, it } from "vitest";
import { publicDemoAccount, publicDemoNotice } from "../../src/lib/demo-account";
import {
  businessPermissions,
  canMembershipPerform,
} from "../../src/modules/identity/access-policy";

const publicViewerMembership = {
  role: "viewer",
  permissions: [businessPermissions.view],
  status: "active",
};

describe("public demo account boundary", () => {
  it("uses unmistakably public fictional credentials", () => {
    expect(publicDemoAccount.email).toMatch(/\.example$/);
    expect(publicDemoAccount.password).toContain("PUBLIC-DEMO");
    expect(publicDemoNotice).toContain("view-only");
    expect(publicDemoNotice).toContain("never be reused");
  });

  it("allows dashboard viewing but denies editing and publishing", () => {
    expect(
      canMembershipPerform(publicViewerMembership, businessPermissions.view),
    ).toBe(true);
    expect(
      canMembershipPerform(
        publicViewerMembership,
        businessPermissions.editProfile,
      ),
    ).toBe(false);
    expect(
      canMembershipPerform(publicViewerMembership, businessPermissions.publish),
    ).toBe(false);
  });
});
