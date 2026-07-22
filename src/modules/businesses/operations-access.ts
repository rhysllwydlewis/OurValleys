import { businessPermissions } from "@/modules/identity/access-policy";

/**
 * The current operations route renders contacts, retained enquiries, draft
 * content, lifecycle controls and analytics together. Until those capabilities
 * are split into independently guarded routes, entry requires every matching
 * private-read permission so a restricted membership cannot trigger broader
 * page data loading.
 */
export const businessOperationsRoutePermissions = [
  businessPermissions.manageContacts,
  businessPermissions.manageEnquiries,
  businessPermissions.manageContent,
  businessPermissions.manageLifecycle,
  businessPermissions.viewAnalytics,
] as const;

export function hasCompleteBusinessOperationsAccess(
  permissionResults: readonly boolean[],
): boolean {
  return (
    permissionResults.length === businessOperationsRoutePermissions.length &&
    permissionResults.every(Boolean)
  );
}
