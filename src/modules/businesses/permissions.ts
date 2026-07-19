export type BusinessRole = "owner" | "manager" | "editor";

export type BusinessMembershipContext = {
  userId: string;
  businessId: string;
  role: BusinessRole;
  revokedAt: Date | null;
};

const rolePermissions: Record<BusinessRole, ReadonlySet<string>> = {
  owner: new Set(["business:read", "business:update", "business:publish", "business:members", "business:transfer"]),
  manager: new Set(["business:read", "business:update", "business:publish", "business:members"]),
  editor: new Set(["business:read", "business:update"]),
};

export function canActOnBusiness(
  membership: BusinessMembershipContext | null,
  requestedBusinessId: string,
  permission: string,
): boolean {
  if (!membership || membership.revokedAt) return false;
  if (membership.businessId !== requestedBusinessId) return false;
  return rolePermissions[membership.role].has(permission);
}
