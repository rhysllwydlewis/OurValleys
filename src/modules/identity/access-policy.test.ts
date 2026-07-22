import { describe, expect, it } from "vitest";
import {
  businessPermissions,
  canMembershipPerform,
  permissionsForBusinessRole,
} from "./access-policy";

describe("canMembershipPerform", () => {
  it("allows fully provisioned owners to perform every supported business action", () => {
    const permissions = permissionsForBusinessRole("owner");

    for (const permission of Object.values(businessPermissions)) {
      expect(
        canMembershipPerform(
          { role: "owner", permissions, status: "active" },
          permission,
        ),
      ).toBe(true);
    }
  });

  it("honours an explicitly restricted owner permission set", () => {
    const permissions = [
      businessPermissions.view,
      businessPermissions.editProfile,
      businessPermissions.publish,
    ];
    const membership = { role: "owner", permissions, status: "active" };

    expect(
      canMembershipPerform(membership, businessPermissions.editProfile),
    ).toBe(true);
    expect(canMembershipPerform(membership, businessPermissions.publish)).toBe(
      true,
    );
    expect(
      canMembershipPerform(membership, businessPermissions.manageMembers),
    ).toBe(false);
    expect(
      canMembershipPerform(membership, businessPermissions.manageLifecycle),
    ).toBe(false);
  });

  it("allows managers to publish and operate content without managing ownership", () => {
    const permissions = permissionsForBusinessRole("manager");
    expect(
      canMembershipPerform(
        { role: "manager", permissions, status: "active" },
        businessPermissions.publish,
      ),
    ).toBe(true);
    expect(
      canMembershipPerform(
        { role: "manager", permissions, status: "active" },
        businessPermissions.manageEnquiries,
      ),
    ).toBe(true);
    expect(
      canMembershipPerform(
        { role: "manager", permissions, status: "active" },
        businessPermissions.manageMembers,
      ),
    ).toBe(false);
    expect(
      canMembershipPerform(
        { role: "manager", permissions, status: "active" },
        businessPermissions.manageClaims,
      ),
    ).toBe(false);
  });

  it("enforces least-privilege defaults for editors and viewers", () => {
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
          role: "editor",
          permissions: [businessPermissions.publish],
          status: "active",
        },
        businessPermissions.publish,
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

  it("requires every role permission to be explicitly assigned", () => {
    expect(
      canMembershipPerform(
        { role: "owner", permissions: [], status: "active" },
        businessPermissions.publish,
      ),
    ).toBe(false);
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
          permissions: permissionsForBusinessRole("owner"),
          status: "suspended",
        },
        businessPermissions.publish,
      ),
    ).toBe(false);

    expect(canMembershipPerform(null, businessPermissions.view)).toBe(false);

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
