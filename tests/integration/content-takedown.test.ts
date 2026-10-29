import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
import { contentReport } from "@/lib/database/schema/moderation";
import {
  removeBusinessOffer,
  saveBusinessOffer,
} from "@/modules/businesses/content-features";
import {
  applyOfferQuickAction,
  saveStudioOffer,
} from "@/modules/businesses/offer-studio";
import { getPublicOffer } from "@/modules/businesses/public-offer-detail";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import {
  getReportableUpdate,
  listBusinessUpdates,
} from "@/modules/businesses/public-updates";
import {
  listStudioUpdates,
  removeStudioUpdate,
  saveStudioUpdate,
  setStudioUpdateState,
} from "@/modules/businesses/updates";
import {
  listContentReports,
  MAX_OPEN_REPORTS_PER_TARGET,
  removeReportedContent,
  restoreReportedContent,
  submitContentReport,
  submitOfferReport,
  submitUpdateReport,
} from "@/modules/moderation/content-reports";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000931",
  businessId: "00000000-0000-4000-8000-000000000932",
  otherBusinessId: "00000000-0000-4000-8000-000000000933",
  adminUserId: "00000000-0000-4000-8000-000000000934",
  reporterUserId: "00000000-0000-4000-8000-000000000935",
  offerId: "00000000-0000-4000-8000-000000000936",
  draftOfferId: "00000000-0000-4000-8000-000000000937",
  updateId: "00000000-0000-4000-8000-000000000938",
  draftUpdateId: "00000000-0000-4000-8000-000000000939",
} as const;

const offerFields = {
  title: "Fixture takedown offer",
  description: "A fictional offer used only by takedown tests.",
  terms: null,
  actionUrl: null,
  actionLabel: null,
  startsAt: null,
  endsAt: null,
  status: "active" as const,
};

describeDatabase("report and take down offers and updates", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture takedown services",
      slug: "fixture-takedown-services",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessId, "takedown-fixture-studio"],
      [fixture.otherBusinessId, "takedown-other-studio"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Takedown ${slug}`,
        slug,
        summary: "A fictional business used only by takedown tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
        status: "published",
      });
    }
    await database.insert(user).values([
      {
        id: fixture.adminUserId,
        name: "Fixture Admin",
        email: "admin@takedown-fixture.test",
        emailVerified: true,
        role: "admin",
      },
      {
        id: fixture.reporterUserId,
        name: "Fixture Reporter",
        email: "reporter@takedown-fixture.test",
        emailVerified: true,
      },
    ]);
    await database.insert(businessOffer).values([
      { id: fixture.offerId, businessId: fixture.businessId, ...offerFields },
      {
        id: fixture.draftOfferId,
        businessId: fixture.businessId,
        ...offerFields,
        title: "Fixture draft offer",
        status: "draft",
      },
    ]);
    await database.insert(businessUpdate).values([
      {
        id: fixture.updateId,
        businessId: fixture.businessId,
        title: "Fixture takedown update",
        body: "A fictional update used only by takedown tests.",
        status: "published",
        publishedAt: new Date("2026-10-01T10:00:00Z"),
      },
      {
        id: fixture.draftUpdateId,
        businessId: fixture.businessId,
        title: "Fixture draft update",
        body: "A fictional draft.",
        status: "draft",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    // Offers, updates and their reports cascade from the businesses.
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.adminUserId));
    await database.delete(user).where(eq(user.id, fixture.reporterUserId));
  });

  async function reportId(kind: "offer" | "update") {
    const listed = await listContentReports("open");
    const found = listed.reports.find((report) => report.targetType === kind);
    expect(found).toBeDefined();
    return found!.id;
  }

  describe("reporting", () => {
    it("accepts a report on a live offer and a published update, and lists them", async () => {
      expect(
        await submitOfferReport({
          offerId: fixture.offerId,
          reason: "misleading_or_scam",
          details: "Asks for a deposit by gift card.",
        }),
      ).toEqual({ status: "submitted" });
      expect(
        await submitUpdateReport({
          updateId: fixture.updateId,
          reason: "spam_or_advertising",
          reporterUserId: fixture.reporterUserId,
        }),
      ).toEqual({ status: "submitted" });

      const { state, reports } = await listContentReports("open");
      expect(state).toBe("ready");
      const offer = reports.find((r) => r.targetType === "offer");
      const update = reports.find((r) => r.targetType === "update");
      expect(offer).toMatchObject({
        offerId: fixture.offerId,
        offerTitle: "Fixture takedown offer",
        targetStatus: "active",
        businessId: fixture.businessId,
        reason: "misleading_or_scam",
      });
      expect(update).toMatchObject({
        updateId: fixture.updateId,
        updateTitle: "Fixture takedown update",
        targetStatus: "published",
        reason: "spam_or_advertising",
      });
    });

    it("refuses drafts, unknown ids and reasons from another kind", async () => {
      expect(
        await submitOfferReport({
          offerId: fixture.draftOfferId,
          reason: "other",
        }),
      ).toEqual({ status: "not_found" });
      expect(
        await submitOfferReport({
          offerId: "00000000-0000-4000-8000-0000000009ff",
          reason: "other",
        }),
      ).toEqual({ status: "not_found" });
      expect(
        await submitUpdateReport({
          updateId: fixture.draftUpdateId,
          reason: "other",
        }),
      ).toEqual({ status: "not_found" });
      // An update reason is not an offer reason.
      expect(
        await submitOfferReport({
          offerId: fixture.offerId,
          reason: "spam_or_advertising" as never,
        }),
      ).toEqual({ status: "unavailable" });
      expect(
        await submitOfferReport({ offerId: "not-a-uuid", reason: "other" }),
      ).toEqual({ status: "unavailable" });
      expect((await listContentReports("open")).reports).toHaveLength(0);
    });

    it("does not add a second open report from the same person or email", async () => {
      await submitOfferReport({
        offerId: fixture.offerId,
        reason: "other",
        reporterUserId: fixture.reporterUserId,
      });
      expect(
        await submitOfferReport({
          offerId: fixture.offerId,
          reason: "incorrect_details",
          reporterUserId: fixture.reporterUserId,
        }),
      ).toEqual({ status: "submitted" });
      await submitUpdateReport({
        updateId: fixture.updateId,
        reason: "other",
        reporterEmail: "Someone@Example.test",
      });
      await submitUpdateReport({
        updateId: fixture.updateId,
        reason: "other",
        reporterEmail: "someone@example.test",
      });
      const open = (await listContentReports("open")).reports;
      expect(open.filter((r) => r.targetType === "offer")).toHaveLength(1);
      expect(open.filter((r) => r.targetType === "update")).toHaveLength(1);
    });

    it("stops adding open reports at the per-item cap", async () => {
      for (let index = 0; index < MAX_OPEN_REPORTS_PER_TARGET + 5; index += 1) {
        await submitOfferReport({
          offerId: fixture.offerId,
          reason: "other",
          reporterEmail: `person${index}@example.test`,
        });
      }
      const rows = await getDatabase()
        .select({ id: contentReport.id })
        .from(contentReport)
        .where(eq(contentReport.offerId, fixture.offerId));
      expect(rows).toHaveLength(MAX_OPEN_REPORTS_PER_TARGET);
    });

    it("keeps one target per report", async () => {
      await expect(
        getDatabase().insert(contentReport).values({
          businessId: fixture.businessId,
          offerId: fixture.offerId,
          reason: "other",
        }),
      ).rejects.toThrow();
      await expect(
        getDatabase().insert(contentReport).values({ reason: "other" }),
      ).rejects.toThrow();
    });

    it("lists reports of every kind together without mixing targets", async () => {
      await submitContentReport({
        businessId: fixture.businessId,
        reason: "other",
      });
      await submitOfferReport({ offerId: fixture.offerId, reason: "other" });
      await submitUpdateReport({ updateId: fixture.updateId, reason: "other" });
      const kinds = (await listContentReports("open")).reports
        .map((r) => r.targetType)
        .sort();
      expect(kinds).toEqual(["business", "offer", "update"]);
    });
  });

  describe("removal", () => {
    it("removes a reported offer, resolves its open reports and hides it everywhere", async () => {
      await submitOfferReport({ offerId: fixture.offerId, reason: "other" });
      await submitOfferReport({
        offerId: fixture.offerId,
        reason: "misleading_or_scam",
        reporterEmail: "second@example.test",
      });
      const id = await reportId("offer");

      const removed = await removeReportedContent({
        kind: "offer",
        reportId: id,
        adminUserId: fixture.adminUserId,
      });
      expect(removed).toEqual({
        status: "removed",
        kind: "offer",
        targetId: fixture.offerId,
      });
      const [row] = await getDatabase()
        .select({ status: businessOffer.status })
        .from(businessOffer)
        .where(eq(businessOffer.id, fixture.offerId));
      expect(row?.status).toBe("removed");
      expect((await listContentReports("open")).reports).toHaveLength(0);
      expect((await listContentReports("resolved")).reports).toHaveLength(2);

      // Public surfaces no longer know the offer.
      expect((await getPublicOffer(fixture.offerId, "en")).state).toBe(
        "not_found",
      );
      const list = await listPublicOffers({ query: "Fixture takedown" });
      expect(
        list.state === "ready" &&
          list.offers.some((offer) => offer.id === fixture.offerId),
      ).toBe(false);
      // No new report can be filed against it.
      expect(
        await submitOfferReport({ offerId: fixture.offerId, reason: "other" }),
      ).toEqual({ status: "not_found" });
      // Removing twice changes nothing.
      expect(
        await removeReportedContent({
          kind: "offer",
          reportId: id,
          adminUserId: fixture.adminUserId,
        }),
      ).toEqual({ status: "not_found" });
    });

    it("removes a reported update and takes it off the business's public updates", async () => {
      await submitUpdateReport({ updateId: fixture.updateId, reason: "other" });
      const id = await reportId("update");
      const before = await listBusinessUpdates({
        businessId: fixture.businessId,
      });
      expect(before.updates.map((u) => u.id)).toEqual([fixture.updateId]);
      expect(await getReportableUpdate(fixture.updateId)).not.toBeNull();

      expect(
        await removeReportedContent({
          kind: "update",
          reportId: id,
          adminUserId: fixture.adminUserId,
        }),
      ).toEqual({
        status: "removed",
        kind: "update",
        targetId: fixture.updateId,
      });
      const after = await listBusinessUpdates({
        businessId: fixture.businessId,
      });
      expect(after.updates).toHaveLength(0);
      expect(await getReportableUpdate(fixture.updateId)).toBeNull();
      expect(
        await submitUpdateReport({
          updateId: fixture.updateId,
          reason: "other",
        }),
      ).toEqual({ status: "not_found" });
    });

    it("refuses to remove through a report of a different kind", async () => {
      await submitOfferReport({ offerId: fixture.offerId, reason: "other" });
      await submitContentReport({
        businessId: fixture.businessId,
        reason: "other",
      });
      const offerReport = await reportId("offer");
      expect(
        await removeReportedContent({
          kind: "update",
          reportId: offerReport,
          adminUserId: fixture.adminUserId,
        }),
      ).toEqual({ status: "not_found" });
      const business = (await listContentReports("open")).reports.find(
        (r) => r.targetType === "business",
      );
      expect(
        await removeReportedContent({
          kind: "offer",
          reportId: business!.id,
          adminUserId: fixture.adminUserId,
        }),
      ).toEqual({ status: "not_found" });
      const [row] = await getDatabase()
        .select({ status: businessOffer.status })
        .from(businessOffer)
        .where(eq(businessOffer.id, fixture.offerId));
      expect(row?.status).toBe("active");
    });
  });

  describe("owner lock", () => {
    async function removeBoth() {
      await submitOfferReport({ offerId: fixture.offerId, reason: "other" });
      await submitUpdateReport({ updateId: fixture.updateId, reason: "other" });
      for (const kind of ["offer", "update"] as const) {
        await removeReportedContent({
          kind,
          reportId: await reportId(kind),
          adminUserId: fixture.adminUserId,
        });
      }
    }

    it("stops the owner editing, republishing, extending or deleting a removed offer", async () => {
      await removeBoth();
      expect(
        await saveStudioOffer({
          businessId: fixture.businessId,
          offerId: fixture.offerId,
          offer: { ...offerFields, title: "Reinstated" },
        }),
      ).toBe("locked");
      for (const action of [
        "publish",
        "resume",
        "pause",
        "duplicate",
      ] as const) {
        expect(
          await applyOfferQuickAction({
            businessId: fixture.businessId,
            offerId: fixture.offerId,
            action,
          }),
        ).toBe("locked");
      }
      expect(
        await saveBusinessOffer({
          businessId: fixture.businessId,
          offer: {
            id: fixture.offerId,
            title: "Reinstated",
            description: "A fictional offer used only by takedown tests.",
            terms: null,
            actionLabel: null,
            actionUrl: null,
            startsAt: null,
            endsAt: null,
            status: "active",
            sortOrder: 0,
          },
        }),
      ).toBe("locked");
      expect(
        await removeBusinessOffer(fixture.businessId, fixture.offerId),
      ).toBe("locked");
      const [row] = await getDatabase()
        .select({ status: businessOffer.status, title: businessOffer.title })
        .from(businessOffer)
        .where(eq(businessOffer.id, fixture.offerId));
      expect(row).toEqual({
        status: "removed",
        title: "Fixture takedown offer",
      });
    });

    it("stops the owner editing, republishing, unpublishing or deleting a removed update", async () => {
      await removeBoth();
      const update = {
        title: "Reinstated",
        body: "Back again.",
        titleCy: null,
        bodyCy: null,
      };
      for (const intent of ["save", "publish"] as const) {
        expect(
          await saveStudioUpdate({
            businessId: fixture.businessId,
            updateId: fixture.updateId,
            update,
            intent,
          }),
        ).toEqual({ result: "locked" });
      }
      for (const to of ["published", "draft"] as const) {
        expect(
          await setStudioUpdateState({
            businessId: fixture.businessId,
            updateId: fixture.updateId,
            to,
          }),
        ).toBe("locked");
      }
      // The row cannot be deleted either; it stays as a record.
      expect(
        await removeStudioUpdate({
          businessId: fixture.businessId,
          updateId: fixture.updateId,
        }),
      ).toBe("not_found");
      const listed = await listStudioUpdates(fixture.businessId);
      expect(listed.status).toBe("ok");
      const row =
        listed.status === "ok"
          ? listed.updates.find((u) => u.id === fixture.updateId)
          : undefined;
      expect(row).toMatchObject({
        status: "removed",
        title: "Fixture takedown update",
      });
    });

    it("keeps a removed item counted against the owner's caps", async () => {
      await removeBoth();
      const rows = await getDatabase()
        .select({ id: businessOffer.id })
        .from(businessOffer)
        .where(eq(businessOffer.businessId, fixture.businessId));
      // Both the removed and the draft offer still exist.
      expect(rows).toHaveLength(2);
    });

    it("does not let another business's studio see or change the item", async () => {
      await removeBoth();
      expect(
        await saveStudioOffer({
          businessId: fixture.otherBusinessId,
          offerId: fixture.offerId,
          offer: offerFields,
        }),
      ).toBe("not_found");
      expect(
        await applyOfferQuickAction({
          businessId: fixture.otherBusinessId,
          offerId: fixture.offerId,
          action: "publish",
        }),
      ).toBe("not_found");
      expect(
        await setStudioUpdateState({
          businessId: fixture.otherBusinessId,
          updateId: fixture.updateId,
          to: "published",
        }),
      ).toBe("not_found");
      expect(
        await removeBusinessOffer(fixture.otherBusinessId, fixture.offerId),
      ).toBe("not_found");
    });
  });

  describe("restore", () => {
    it("brings an offer back paused and an update back as a draft, once", async () => {
      await submitOfferReport({ offerId: fixture.offerId, reason: "other" });
      await submitUpdateReport({ updateId: fixture.updateId, reason: "other" });
      const ids = {
        offer: await reportId("offer"),
        update: await reportId("update"),
      };
      for (const kind of ["offer", "update"] as const) {
        await removeReportedContent({
          kind,
          reportId: ids[kind],
          adminUserId: fixture.adminUserId,
        });
      }

      expect(
        await restoreReportedContent({ kind: "offer", reportId: ids.offer }),
      ).toEqual({
        status: "restored",
        kind: "offer",
        targetId: fixture.offerId,
      });
      expect(
        await restoreReportedContent({ kind: "update", reportId: ids.update }),
      ).toEqual({
        status: "restored",
        kind: "update",
        targetId: fixture.updateId,
      });
      const [offer] = await getDatabase()
        .select({ status: businessOffer.status })
        .from(businessOffer)
        .where(eq(businessOffer.id, fixture.offerId));
      const [update] = await getDatabase()
        .select({ status: businessUpdate.status })
        .from(businessUpdate)
        .where(eq(businessUpdate.id, fixture.updateId));
      // Neither is public again until the owner chooses.
      expect(offer?.status).toBe("hidden");
      expect(update?.status).toBe("draft");
      expect((await getPublicOffer(fixture.offerId, "en")).state).toBe(
        "not_found",
      );

      // Nothing left to restore, and a live item cannot be "restored".
      expect(
        await restoreReportedContent({ kind: "offer", reportId: ids.offer }),
      ).toEqual({ status: "not_found" });
      // The owner can work with it again.
      expect(
        await applyOfferQuickAction({
          businessId: fixture.businessId,
          offerId: fixture.offerId,
          action: "resume",
        }),
      ).toBe("done");
    });

    it("refuses an unknown report id", async () => {
      expect(
        await restoreReportedContent({
          kind: "offer",
          reportId: "00000000-0000-4000-8000-0000000009fe",
        }),
      ).toEqual({ status: "not_found" });
    });
  });
});
