import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
} from "@/lib/database/schema/business";
import {
  getPublishedBusinessBySlug,
  listPublishedBusinesses,
} from "@/modules/businesses/public";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000000101",
  businessId: "00000000-0000-4000-8000-000000000401",
  businessSlug: "cwm-coil-heating",
  locationId: "00000000-0000-4000-8000-000000000701",
} as const;

describeDatabase("public business discovery", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("uses the same canonical business for directory and generated page", async () => {
    const directory = await listPublishedBusinesses({ query: "heating" });
    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);

    expect(directory.state).toBe("ready");
    expect(detail.state).toBe("ready");

    if (directory.state !== "ready" || detail.state !== "ready") return;

    expect(directory.businesses).toHaveLength(1);
    expect(directory.businesses[0]?.id).toBe(fixture.businessId);
    expect(detail.business.id).toBe(fixture.businessId);
    expect(detail.business.services).toHaveLength(3);
  });

  it("keeps private canonical fields out of the public projection", async () => {
    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);
    expect(detail.state).toBe("ready");

    const serialised = JSON.stringify(detail);
    expect(serialised).not.toContain("legalNamePrivate");
    expect(serialised).not.toContain("privateAddressLineOne");
    expect(serialised).not.toContain("Fixture Workshop");
    expect(serialised).not.toContain("CF00 0XX");

    const database = getDatabase();
    const [canonicalBusiness] = await database
      .select({ legalNamePrivate: business.legalNamePrivate })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    const [canonicalLocation] = await database
      .select({
        privateAddressLineOne: businessLocation.privateAddressLineOne,
        privatePostcode: businessLocation.privatePostcode,
      })
      .from(businessLocation)
      .where(eq(businessLocation.id, fixture.locationId));

    expect(canonicalBusiness?.legalNamePrivate).toContain("Fictional");
    expect(canonicalLocation?.privateAddressLineOne).toContain("Fixture");
    expect(canonicalLocation?.privatePostcode).toBe("CF00 0XX");
  });

  it("allows the active owner and denies cross-tenant access", async () => {
    await expect(
      canUserAccessBusiness({
        userId: fixture.ownerId,
        businessId: fixture.businessId,
        permission: businessPermissions.publish,
      }),
    ).resolves.toBe(true);

    await expect(
      canUserAccessBusiness({
        userId: "00000000-0000-4000-8000-000000000999",
        businessId: fixture.businessId,
        permission: businessPermissions.view,
      }),
    ).resolves.toBe(false);

    await expect(
      canUserAccessBusiness({
        userId: fixture.ownerId,
        businessId: "00000000-0000-4000-8000-000000000998",
        permission: businessPermissions.view,
      }),
    ).resolves.toBe(false);
  });
});
