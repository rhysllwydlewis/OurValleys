import { describe, expect, it } from "vitest";
import {
  businessOperationsRoutePermissions,
  hasCompleteBusinessOperationsAccess,
} from "../../src/modules/businesses/operations-access";
import { businessPermissions } from "../../src/modules/identity/access-policy";

describe("business operations route access", () => {
  it("requires every private data capability rendered by the combined route", () => {
    expect(businessOperationsRoutePermissions).toEqual([
      businessPermissions.manageContacts,
      businessPermissions.manageEnquiries,
      businessPermissions.manageContent,
      businessPermissions.manageLifecycle,
      businessPermissions.viewAnalytics,
    ]);
  });

  it("denies incomplete, missing or unexpectedly shaped permission results", () => {
    expect(
      hasCompleteBusinessOperationsAccess(
        businessOperationsRoutePermissions.map(() => true),
      ),
    ).toBe(true);

    for (let deniedIndex = 0; deniedIndex < 5; deniedIndex += 1) {
      const results = businessOperationsRoutePermissions.map(
        (_, index) => index !== deniedIndex,
      );
      expect(hasCompleteBusinessOperationsAccess(results)).toBe(false);
    }

    expect(hasCompleteBusinessOperationsAccess([])).toBe(false);
    expect(
      hasCompleteBusinessOperationsAccess([
        ...businessOperationsRoutePermissions.map(() => true),
        true,
      ]),
    ).toBe(false);
  });
});
