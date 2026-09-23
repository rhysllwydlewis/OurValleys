import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessEnquiry } from "@/lib/database/schema/business-operations";
import { adminAuditLog } from "@/lib/database/schema/moderation";
import { replyToBusinessEnquiry } from "@/modules/businesses/contacts-and-enquiries";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000941",
  businessId: "00000000-0000-4000-8000-000000000942",
  otherBusinessId: "00000000-0000-4000-8000-000000000943",
} as const;

describeDatabase("business enquiry reply", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture enquiry reply services",
      slug: "fixture-enquiry-reply-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values([
      {
        id: fixture.businessId,
        tradingName: "Enquiry Reply Fixture Studio",
        slug: "enquiry-reply-fixture-studio",
        summary: "A fictional business used only by enquiry reply tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
      {
        id: fixture.otherBusinessId,
        tradingName: "Other Enquiry Reply Fixture Studio",
        slug: "other-enquiry-reply-fixture-studio",
        summary:
          "A second fictional business used only by enquiry reply tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(adminAuditLog)
      .where(eq(adminAuditLog.action, "business.enquiry_replied"));
    await database
      .delete(businessEnquiry)
      .where(eq(businessEnquiry.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function insertEnquiry(overrides: {
    senderEmail: string | null;
    dedupeKey: string;
  }) {
    const database = getDatabase();
    const [row] = await database
      .insert(businessEnquiry)
      .values({
        businessId: fixture.businessId,
        senderName: "Fixture Sender",
        senderEmail: overrides.senderEmail,
        message: "Do you have availability next week?",
        consentAccepted: true,
        dedupeKey: overrides.dedupeKey,
      })
      .returning();
    if (!row) throw new Error("Expected an inserted enquiry");
    return row;
  }

  it("sends a reply email and marks the enquiry as replied", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: "sender@enquiry-reply-fixture.test",
      dedupeKey: "reply-sent",
    });

    const result = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "Yes, we have space on Tuesday afternoon.",
    });
    expect(result).toBe("sent");

    const database = getDatabase();
    const [updated] = await database
      .select({ status: businessEnquiry.status })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    expect(updated?.status).toBe("replied");
  });

  it("refuses to reply when the enquiry has no email on file", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: null,
      dedupeKey: "reply-no-email",
    });

    const result = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "This should not be sent.",
    });
    expect(result).toBe("no_email");

    const database = getDatabase();
    const [row] = await database
      .select({ status: businessEnquiry.status })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    expect(row?.status).toBe("new");
  });

  it("rejects an empty or oversized reply body without sending anything", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: "sender@enquiry-reply-fixture.test",
      dedupeKey: "reply-invalid-body",
    });

    const empty = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "   ",
    });
    expect(empty).toBe("invalid");

    const oversized = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "a".repeat(2001),
    });
    expect(oversized).toBe("invalid");

    const database = getDatabase();
    const [row] = await database
      .select({ status: businessEnquiry.status })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    expect(row?.status).toBe("new");
  });

  it("rate-limits replies once a business's hourly cap is reached", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: "sender@enquiry-reply-fixture.test",
      dedupeKey: "reply-rate-limited",
    });

    const database = getDatabase();
    await database.insert(adminAuditLog).values(
      Array.from({ length: 20 }, () => ({
        action: "business.enquiry_replied" as const,
        targetType: "business_enquiry",
        targetId: enquiry.id,
        metadata: { businessId: fixture.businessId },
      })),
    );

    const result = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "This should be blocked by the hourly cap.",
    });
    expect(result).toBe("rate_limited");

    const [row] = await database
      .select({ status: businessEnquiry.status })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    expect(row?.status).toBe("new");
  });

  it("does not count another business's replies toward this business's cap", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: "sender@enquiry-reply-fixture.test",
      dedupeKey: "reply-other-business-cap",
    });

    const database = getDatabase();
    await database.insert(adminAuditLog).values(
      Array.from({ length: 20 }, () => ({
        action: "business.enquiry_replied" as const,
        targetType: "business_enquiry",
        targetId: enquiry.id,
        metadata: { businessId: fixture.otherBusinessId },
      })),
    );

    const result = await replyToBusinessEnquiry({
      businessId: fixture.businessId,
      enquiryId: enquiry.id,
      body: "This business has its own, unused cap.",
    });
    expect(result).toBe("sent");
  });

  it("refuses a reply targeting an enquiry that belongs to a different business", async () => {
    const enquiry = await insertEnquiry({
      senderEmail: "sender@enquiry-reply-fixture.test",
      dedupeKey: "reply-cross-tenant",
    });

    const result = await replyToBusinessEnquiry({
      businessId: fixture.otherBusinessId,
      enquiryId: enquiry.id,
      body: "This should not be applied.",
    });
    expect(result).toBe("not_found");

    const database = getDatabase();
    const [row] = await database
      .select({ status: businessEnquiry.status })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, enquiry.id));
    expect(row?.status).toBe("new");
  });
});
