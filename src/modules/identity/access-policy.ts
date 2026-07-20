export const platformRoles = [
  "resident",
  "business_user",
  "moderator",
  "admin",
] as const;

export type PlatformRole = (typeof platformRoles)[number];

export const businessPermissions = {
  view: "business.view",
  editProfile: "business.edit_profile",
  publish: "business.publish",
  manageMembers: "business.manage_members",
} as const;

export type BusinessPermission =
  (typeof businessPermissions)[keyof typeof businessPermissions];

export const businessMembershipRoles = [
  "owner",
  "manager",
  "editor",
  "viewer",
] as const;

export type BusinessMembershipRole = (typeof businessMembershipRoles)[number];

const permissionValues = new Set<string>(Object.values(businessPermissions));
const membershipRoleValues = new Set<string>(businessMembershipRoles);

const rolePermissions: Record<
  BusinessMembershipRole,
  readonly BusinessPermission[]
> = {
  owner: Object.values(businessPermissions),
  manager: [
    businessPermissions.view,
    businessPermissions.editProfile,
    businessPermissions.publish,
    businessPermissions.manageMembers,
  ],
  editor: [
    businessPermissions.view,
    businessPermissions.editProfile,
    businessPermissions.publish,
  ],
  viewer: [businessPermissions.view],
};

export function isBusinessPermission(value: string): value is BusinessPermission {
  return permissionValues.has(value);
}

export function isBusinessMembershipRole(
  value: string,
): value is BusinessMembershipRole {
  return membershipRoleValues.has(value);
}

export function canMembershipPerform(
  membership: {
    role: string;
    permissions: readonly string[];
    status: string;
  } | null,
  requestedPermission: BusinessPermission,
): boolean {
  if (!membership || membership.status !== "active") return false;
  if (!isBusinessMembershipRole(membership.role)) return false;

  const allowedByRole =
    rolePermissions[membership.role].includes(requestedPermission);
  if (!allowedByRole) return false;

  if (membership.role === "owner") return true;

  return membership.permissions.some(
    (permission) =>
      isBusinessPermission(permission) && permission === requestedPermission,
  );
}
