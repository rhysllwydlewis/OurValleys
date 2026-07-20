import { describe, expect, it } from "vitest";
import {
  businessPermissions,
  canMembershipPerform,
} from "./access-policy";

describe("canMembershipPerform", () => {
  it("allows owners to perform every supported business action", () => {
    for (const permission of Object.values(businessPermissions)) {
      expect(
        canMembershipPerform(
          { role: "owner", permissions: [], status: "active" },
          permission,
        ),
      ).toBe(true);
    }
  });

  it("enforces least-privilege defaults for supported roles", () => {
    expect(
      canMembershipPerform(
        {
          role: "manager",
          permissions: [businessPermissions.manageMembers],
          status: "active",
        },
        businessPermissions.manageMembers,
      ),
    ).toBe(true);

    expect(
      canMembershipPerform(
        {
          role: "editor",
          permissions: [businessPermissions.editProfile],
          status: "active",
        },
        businessPermissions.manageMembers,
      ),
    ).toBe(false);

    expect(
      canMembershipPerform(
        {
          role: "viewer",
          permissions: [businessPermissions.view],
          status: "active",
        },
        businessPermissions.editProfile,
      ),
    ).toBe(false);
  });

  it("requires non-owner permissions to be explicitly assigned", () => {
    expect(
      canMembershipPerform(
        { role: "editor", permissions: [], status: "active" },
        businessPermissions.editProfile,
      ),
    ).toBe(false);
  });

  it("fails closed for inactive, missing and malformed memberships", () => {
    expect(
      canMembershipPerform(
        {
          role: "owner",
          permissions: [],
          status: "suspended",
        },
        businessPermissions.publish,
      ),
    ).toBe(false);

    expect(
      canMembershipPerform(null, businessPermissions.view),
    ).toBe(false);

    expect(
      canMembershipPerform(
        {
          role: "super-admin",
          permissions: [businessPermissions.manageMembers],
          status: "active",
        },
        businessPermissions.manageMembers,
      ),
    ).toBe(false);
  });

  it("ignores unknown permissions rather than allowing privilege escape", () => {
    expect(
      canMembershipPerform(
        {
          role: "viewer",
          permissions: ["business.*", "business.manage_members"],
          status: "active",
        },
        businessPermissions.manageMembers,
      ),
    ).toBe(false);
  });
});
