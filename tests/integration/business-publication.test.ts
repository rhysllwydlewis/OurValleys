import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  businessPublication,
  businessSite,
  category,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  approveBusinessPublication,
  reinstateBusiness,
  rejectBusinessPublication,
  submitBusinessForReview,
  suspendBusiness,
} from "@/modules/businesses/publication";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000821",
  businessId: "00000000-0000-4000-8000-000000000822",
  ownerUserId: "00000000-0000-4000-8000-000000000823",
  editorUserId: "00000000-0000-4000-8000-000000000824",
  viewerUserId: "00000000-0000-4000-8000-000000000825",
  adminUserId: "00000000-0000-4000-8000-000000000826",
  ownerMembershipId: "00000000-0000-4000-8000-000000000827",
  editorMembershipId: "00000000-0000-4000-8000-000000000828",
  viewerMembershipId: "00000000-0000-4000-8000-000000000829",
} as const;

const completeDraft = {
  profile: { tradingName: "Fixture Studio", summary: "A fictional summary." },
  location: {
    locationType: "service_area",
    publicAddressVisibility: "service_area_only",
  },
  services: [
    { name: "Fixture service", description: null, priceGuidance: null },
  ],
  hours: [{ day: "monday", closed: true, opensAt: null, closesAt: null }],
};

async function insertBusiness(status = "draft") {
  const database = getDatabase();
  await database.insert(business).values({
    id: fixture.businessId,
    tradingName: "Publication Fixture Studio",
    slug: "publication-fixture-studio",
    summary: "A fictional business used only by publication workflow tests.",
    description: "Fictional description.",
    primaryCategoryId: fixture.categoryId,
    businessType: "limited_company",
    status,
  });
}

describeDatabase("business publication workflow", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture publication services",
      slug: "fixture-publication-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(user).values([
      {
        id: fixture.ownerUserId,
        name: "Fixture Owner",
        email: "owner@publication-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.editorUserId,
        name: "Fixture Editor",
        email: "editor@publication-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.viewerUserId,
        name: "Fixture Viewer",
        email: "viewer@publication-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.adminUserId,
        name: "Fixture Admin",
        email: "admin@publication-fixture.test",
        emailVerified: true,
        role: "admin",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, fixture.businessId));
    await database
      .delete(businessPublication)
      .where(eq(businessPublication.businessId, fixture.businessId));
    await database
      .delete(businessSite)
      .where(eq(businessSite.businessId, fixture.businessId));
    await database
      .delete(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const userId of [
      fixture.ownerUserId,
      fixture.editorUserId,
      fixture.viewerUserId,
      fixture.adminUserId,
    ]) {
      await database.delete(user).where(eq(user.id, userId));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("submitBusinessForReview", () => {
    it("denies a viewer membership", async () => {
      await insertBusiness();
      const database = getDatabase();
      await database.insert(businessMembership).values({
        id: fixture.viewerMembershipId,
        businessId: fixture.businessId,
        userId: fixture.viewerUserId,
        role: "viewer",
        permissions: ["business.view"],
        status: "active",
      });

      const result = await submitBusinessForReview({
        userId: fixture.viewerUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({ status: "forbidden" });
    });

    it("reports missing steps when the draft is incomplete", async () => {
      await insertBusiness();
      const database = getDatabase();
      await database.insert(businessMembership).values({
        id: fixture.editorMembershipId,
        businessId: fixture.businessId,
        userId: fixture.editorUserId,
        role: "editor",
        permissions: [
          "business.view",
          "business.edit_profile",
          "business.publish",
        ],
        status: "active",
      });
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessId,
        profile: completeDraft.profile,
      });

      const result = await submitBusinessForReview({
        userId: fixture.editorUserId,
        businessId: fixture.businessId,
      });
      expect(result.status).toBe("incomplete");
      if (result.status !== "incomplete")
        throw new Error("Expected incomplete");
      expect(result.missingSteps).toEqual(["location", "services", "hours"]);
    });

    it("creates a site and publication row and marks the business pending review", async () => {
      await insertBusiness();
      const database = getDatabase();
      await database.insert(businessMembership).values({
        id: fixture.editorMembershipId,
        businessId: fixture.businessId,
        userId: fixture.editorUserId,
        role: "editor",
        permissions: [
          "business.view",
          "business.edit_profile",
          "business.publish",
        ],
        status: "active",
      });
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessId,
        ...completeDraft,
      });

      const result = await submitBusinessForReview({
        userId: fixture.editorUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({ status: "submitted" });

      const [businessRow] = await database
        .select({ status: business.status })
        .from(business)
        .where(eq(business.id, fixture.businessId));
      expect(businessRow?.status).toBe("pending_review");

      const [publicationRow] = await database
        .select()
        .from(businessPublication)
        .where(eq(businessPublication.businessId, fixture.businessId));
      expect(publicationRow?.status).toBe("pending_review");
      expect(publicationRow?.submittedByUserId).toBe(fixture.editorUserId);
    });

    it("rejects resubmission of an already-published business", async () => {
      await insertBusiness("published");
      const database = getDatabase();
      await database.insert(businessMembership).values({
        id: fixture.editorMembershipId,
        businessId: fixture.businessId,
        userId: fixture.editorUserId,
        role: "editor",
        permissions: [
          "business.view",
          "business.edit_profile",
          "business.publish",
        ],
        status: "active",
      });

      const result = await submitBusinessForReview({
        userId: fixture.editorUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({
        status: "not_eligible",
        currentStatus: "published",
      });
    });
  });

  describe("approve, reject, suspend and reinstate", () => {
    async function submitForReview() {
      const database = getDatabase();
      await database.insert(businessMembership).values({
        id: fixture.editorMembershipId,
        businessId: fixture.businessId,
        userId: fixture.editorUserId,
        role: "editor",
        permissions: [
          "business.view",
          "business.edit_profile",
          "business.publish",
        ],
        status: "active",
      });
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessId,
        ...completeDraft,
      });
      const result = await submitBusinessForReview({
        userId: fixture.editorUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({ status: "submitted" });
    }

    it("approves a pending business and publishes its site", async () => {
      await insertBusiness();
      await submitForReview();

      const result = await approveBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({ status: "approved" });

      const database = getDatabase();
      const [businessRow] = await database
        .select({ status: business.status })
        .from(business)
        .where(eq(business.id, fixture.businessId));
      expect(businessRow?.status).toBe("published");

      const [siteRow] = await database
        .select({ status: businessSite.status })
        .from(businessSite)
        .where(eq(businessSite.businessId, fixture.businessId));
      expect(siteRow?.status).toBe("published");
    });

    it("refuses to approve a business that isn't pending review", async () => {
      await insertBusiness("draft");
      const result = await approveBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
      });
      expect(result).toEqual({ status: "not_found" });
    });

    it("rejects a pending business with a moderation note and allows resubmission", async () => {
      await insertBusiness();
      await submitForReview();

      const rejection = await rejectBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
        note: "Please add a public contact email.",
      });
      expect(rejection).toEqual({ status: "rejected" });

      const database = getDatabase();
      const [businessRow] = await database
        .select({ status: business.status })
        .from(business)
        .where(eq(business.id, fixture.businessId));
      expect(businessRow?.status).toBe("rejected");

      const resubmit = await submitBusinessForReview({
        userId: fixture.editorUserId,
        businessId: fixture.businessId,
      });
      expect(resubmit).toEqual({ status: "submitted" });
    });

    it("suspends a published business and reinstates it", async () => {
      await insertBusiness();
      await submitForReview();
      await approveBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
      });

      const suspended = await suspendBusiness({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
        reason: "Reported as closed.",
      });
      expect(suspended).toEqual({ status: "suspended" });

      const database = getDatabase();
      const [suspendedRow] = await database
        .select({ status: business.status, reason: business.suspensionReason })
        .from(business)
        .where(eq(business.id, fixture.businessId));
      expect(suspendedRow?.status).toBe("suspended");
      expect(suspendedRow?.reason).toBe("Reported as closed.");

      const reinstated = await reinstateBusiness({
        businessId: fixture.businessId,
      });
      expect(reinstated).toEqual({ status: "reinstated" });

      const [reinstatedRow] = await database
        .select({ status: business.status, reason: business.suspensionReason })
        .from(business)
        .where(eq(business.id, fixture.businessId));
      expect(reinstatedRow?.status).toBe("published");
      expect(reinstatedRow?.reason).toBeNull();
    });

    it("refuses to suspend a business that isn't published", async () => {
      await insertBusiness("draft");
      const result = await suspendBusiness({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
        reason: "Not applicable.",
      });
      expect(result).toEqual({ status: "not_published" });
    });
  });
});
