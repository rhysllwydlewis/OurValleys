import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessEnquiry } from "@/lib/database/schema/business-operations";
import {
  purgeExpiredBusinessEnquiries,
  submitBusinessEnquiry,
  updateBusinessEnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000951",
  businessId: "00000000-0000-4000-8000-000000000952",
} as const;

describeDatabase("business enquiry retention", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture enquiry retention services",
      slug: "fixture-enquiry-retention-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Enquiry Retention Fixture Studio",
      slug: "enquiry-retention-fixture-studio",
      summary: "A fictional business used only by enquiry retention tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
      status: "published",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessEnquiry)
      .where(eq(businessEnquiry.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function insertEnquiry(overrides: {
    dedupeKey: string;
    status?: "new" | "read" | "replied" | "closed" | "archived" | "spam";
    retentionExpiresAt?: Date | null;
  }) {
    const database = getDatabase();
    const [row] = await database
      .insert(businessEnquiry)
      .values({
        businessId: fixture.businessId,
        senderName: "Fixture Sender",
        senderEmail: "sender@enquiry-retention-fixture.test",
        message: "Do you have availability next week?",
        consentAccepted: true,
        dedupeKey: overrides.dedupeKey,
        status: overrides.status ?? "new",
        retentionExpiresAt: overrides.retentionExpiresAt,
      })
      .returning();
    if (!row) throw new Error("Expected an inserted enquiry");
    return row;
  }

  it("sets a multi-year retention ceiling on submission", async () => {
    const input = {
      businessId: fixture.businessId,
      kind: "enquiry" as const,
      senderName: "New Enquirer",
      senderEmail: "new-enquirer@enquiry-retention-fixture.test",
      message: "Are you open on bank holidays?",
      consentAccepted: true as const,
      visitorHash: null,
    };
    const result = await submitBusinessEnquiry(input);
    expect(result.status).toBe("submitted");

    const database = getDatabase();
    const [row] = await database
      .select({ retentionExpiresAt: businessEnquiry.retentionExpiresAt })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.businessId, fixture.businessId));
    expect(row?.retentionExpiresAt).not.toBeNull();
    const yearsAhead =
      (row!.retentionExpiresAt!.getTime() - Date.now()) /
      (365 * 24 * 60 * 60 * 1000);
    expect(yearsAhead).toBeGreaterThan(1.9);
    expect(yearsAhead).toBeLessThan(2.1);
  });

  it("shortens retention to 30 days when marked spam", async () => {
    const enquiry = await insertEnquiry({ dedupeKey: "retention-spam" });

    const result = await updateBusinessEnquiryStatus({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      status: "spam",
    });
    expect(result).toBe("updated");

    const database = getDatabase();
    const [row] = await database
      .select({ retentionExpiresAt: businessEnquiry.retentionExpiresAt })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    const daysAhead =
      (row!.retentionExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysAhead).toBeGreaterThan(29);
    expect(daysAhead).toBeLessThan(31);
  });

  it("purges only enquiries past their retention expiry", async () => {
    const expired = await insertEnquiry({
      dedupeKey: "retention-purge-expired",
      status: "closed",
      retentionExpiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    const notYetExpired = await insertEnquiry({
      dedupeKey: "retention-purge-future",
      status: "closed",
      retentionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const openEnded = await insertEnquiry({
      dedupeKey: "retention-purge-open-ended",
      status: "new",
      retentionExpiresAt: null,
    });

    const result = await purgeExpiredBusinessEnquiries();
    expect(result.purged).toBe(1);

    const database = getDatabase();
    const remaining = await database
      .select({ id: businessEnquiry.id })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.businessId, fixture.businessId));
    const remainingIds = remaining.map((row) => row.id).sort();
    expect(remainingIds).toEqual([notYetExpired.id, openEnded.id].sort());
    expect(remainingIds).not.toContain(expired.id);
  });

  it("stamps an expiry on rows that have none instead of keeping them forever", async () => {
    const database = getDatabase();
    const closed = await insertEnquiry({
      dedupeKey: "retention-null-closed",
      status: "closed",
      retentionExpiresAt: null,
    });
    const open = await insertEnquiry({
      dedupeKey: "retention-null-open",
      status: "new",
      retentionExpiresAt: null,
    });

    const result = await purgeExpiredBusinessEnquiries();
    expect(result.stamped).toBeGreaterThanOrEqual(2);
    expect(result.purged).toBe(0);

    const rows = await database
      .select({
        id: businessEnquiry.id,
        retentionExpiresAt: businessEnquiry.retentionExpiresAt,
      })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.businessId, fixture.businessId));
    const byId = new Map(rows.map((row) => [row.id, row.retentionExpiresAt]));
    const closedExpiry = byId.get(closed.id);
    const openExpiry = byId.get(open.id);
    expect(closedExpiry).toBeInstanceOf(Date);
    expect(openExpiry).toBeInstanceOf(Date);
    // Closed rows get the short window, open ones the long ceiling.
    expect(closedExpiry!.getTime()).toBeLessThan(openExpiry!.getTime());
  });
});
