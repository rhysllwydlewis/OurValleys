import "server-only";
import {
  businessOperationsRoutePermissions,
  hasCompleteBusinessOperationsAccess,
} from "@/modules/businesses/operations-access";
import { canUserAccessBusiness } from "@/modules/businesses/permissions";

export type DashboardTabAccess = {
  /** Can open the website designer: any member except the public demo. */
  canDesign: boolean;
  /**
   * Can open the content and insights page: every private-read permission the
   * route needs (the same rule `src/proxy.ts` enforces) and not the demo.
   */
  canOperate: boolean;
};

/**
 * Which dashboard tabs and tiles to offer. This only decides what to show;
 * the proxy and each page still enforce access on their own, so a wrong answer
 * here can never open a page, only offer or hide a link.
 */
export async function readDashboardTabAccess(input: {
  userId: string;
  businessId: string;
  /** From `isPublicDemoEmail` at the call site, so the check stays visible there. */
  isPublicDemo: boolean;
}): Promise<DashboardTabAccess> {
  if (input.isPublicDemo) {
    return { canDesign: false, canOperate: false };
  }
  const results = await Promise.all(
    businessOperationsRoutePermissions.map((permission) =>
      canUserAccessBusiness({
        userId: input.userId,
        businessId: input.businessId,
        permission,
      }),
    ),
  );
  return {
    canDesign: true,
    canOperate: hasCompleteBusinessOperationsAccess(results),
  };
}
