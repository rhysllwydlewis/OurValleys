import { describe, expect, it } from "vitest";
import {
  businessCapabilities,
  defaultFreeEntitlement,
  freeBusinessLimits,
} from "@/modules/businesses/entitlements";

describe("permanent free business entitlement", () => {
  it("keeps every Phase 7–12 core capability in the free plan", () => {
    expect(defaultFreeEntitlement.planKey).toBe("free");
    expect(defaultFreeEntitlement.capabilities).toEqual(
      expect.arrayContaining([
        "contacts",
        "enquiries",
        "offers",
        "events",
        "menu",
        "category_sections",
        "qr",
        "basic_analytics",
      ]),
    );
    expect(defaultFreeEntitlement.capabilities).toHaveLength(
      businessCapabilities.length,
    );
  });

  it("retains the agreed generous media allowance without activating billing", () => {
    expect(defaultFreeEntitlement.limits.galleryImages).toBe(12);
    expect(freeBusinessLimits.logoImages).toBe(1);
    expect(freeBusinessLimits.heroImages).toBe(1);
    expect(defaultFreeEntitlement).not.toHaveProperty("price");
    expect(defaultFreeEntitlement).not.toHaveProperty("billingProvider");
  });
});
