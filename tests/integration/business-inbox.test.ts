import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessEnquiry } from "@/lib/database/schema/business-operations";
import {
  bulkSetEnquiryStatus,
  countUnreadEnquiries,
  getInboxCounts,
  getInboxEnquiry,
  listInbox,
  markEnquiryRead,
} from "@/modules/businesses/inbox";
import { parseInboxQuery } from "@/modules/businesses/inbox-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000951",
  businessId: "00000000-0000-4000-8000-000000000952",
  otherBusinessId: "00000000-0000-4000-8000-000000000953",
} as const;

describeDatabase("business inbox", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture inbox services",
      slug: "fixture-inbox-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessId, "inbox-fixture-studio"],
        [fixture.otherBusinessId, "other-inbox-fixture-studio"],
      ].map(([id, slug]) => ({
        id: id!,
        tradingName: `Fixture ${slug}`,
        slug: slug!,
        summary: "A fictional business used only by inbox tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company" as const,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.businessId, fixture.otherBusinessId]) {
      await database
        .delete(businessEnquiry)
        .where(eq(businessEnquiry.businessId, id));
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  let counter = 0;
  async function add(
    overrides: Partial<typeof businessEnquiry.$inferInsert> = {},
    businessId: string = fixture.businessId,
  ) {
    counter += 1;
    const [row] = await getDatabase()
      .insert(businessEnquiry)
      .values({
        businessId,
        kind: "enquiry",
        senderName: `Sender ${counter}`,
        senderEmail: `sender${counter}@example.test`,
        message: `A fictional message number ${counter} about boilers.`,
        consentAccepted: true,
        dedupeKey: `inbox-test-${counter}-${Math.random()}`,
        submittedAt: new Date(Date.now() - counter * 60_000),
        ...overrides,
      })
      .returning();
    return row!;
  }

  it("counts mailboxes and lists them without crossing businesses", async () => {
    await add({ status: "new" });
    await add({ status: "read" });
    await add({ status: "replied" });
    await add({ status: "archived" });
    await add({ status: "spam" });
    await add({ status: "new" }, fixture.otherBusinessId);

    const { counts, available } = await getInboxCounts(fixture.businessId);
    expect(available).toBe(true);
    expect(counts).toEqual({
      inbox: 2,
      unread: 1,
      replied: 1,
      done: 1,
      spam: 1,
      all: 5,
    });
    expect(await countUnreadEnquiries(fixture.businessId)).toBe(1);

    const open = await listInbox(fixture.businessId, parseInboxQuery({}));
    expect(open.total).toBe(2);
    expect(open.enquiries.map((row) => row.status).sort()).toEqual([
      "new",
      "read",
    ]);
    const spam = await listInbox(
      fixture.businessId,
      parseInboxQuery({ box: "spam" }),
    );
    expect(spam.total).toBe(1);
  });

  it("searches names, email, phone and message literally", async () => {
    await add({
      senderName: "Gwen Parry",
      message: "Need a quote for 50% off",
    });
    await add({
      senderName: "Ifor",
      senderPhone: "07700 900123",
      message: "Radiator bleed",
    });
    const find = async (q: string, box = "all") =>
      (await listInbox(fixture.businessId, parseInboxQuery({ q, box }))).total;
    expect(await find("gwen")).toBe(1);
    expect(await find("RADIATOR")).toBe(1);
    expect(await find("900123")).toBe(1);
    expect(await find("50%")).toBe(1);
    expect(await find("%")).toBe(1); // matches the literal percent only
    expect(await find("_")).toBe(0); // underscore is not a wildcard
    expect(await find("nothing like this")).toBe(0);
  });

  it("filters by kind and pages in newest-first order", async () => {
    for (let index = 0; index < 27; index += 1) {
      await add({
        kind: index % 2 === 0 ? "quote" : "enquiry",
        submittedAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
      });
    }
    const first = await listInbox(
      fixture.businessId,
      parseInboxQuery({ box: "all" }),
    );
    expect(first.enquiries).toHaveLength(25);
    expect(first.hasNextPage).toBe(true);
    expect(first.enquiries[0]!.submittedAt.getTime()).toBeGreaterThan(
      first.enquiries[24]!.submittedAt.getTime(),
    );
    const second = await listInbox(
      fixture.businessId,
      parseInboxQuery({ box: "all", page: "2" }),
    );
    expect(second.enquiries).toHaveLength(2);
    const beyond = await listInbox(
      fixture.businessId,
      parseInboxQuery({ box: "all", page: "9" }),
    );
    expect(beyond.page).toBe(2);
    const quotes = await listInbox(
      fixture.businessId,
      parseInboxQuery({ box: "all", kind: "quote" }),
    );
    expect(quotes.total).toBe(14);
  });

  it("reads one enquiry only inside its own business", async () => {
    const mine = await add();
    expect((await getInboxEnquiry(fixture.businessId, mine.id))?.id).toBe(
      mine.id,
    );
    expect(await getInboxEnquiry(fixture.otherBusinessId, mine.id)).toBeNull();
  });

  it("marks only new enquiries read, and never across businesses", async () => {
    const fresh = await add({ status: "new" });
    const replied = await add({ status: "replied" });
    expect(await markEnquiryRead(fixture.otherBusinessId, fresh.id)).toBe(
      "unchanged",
    );
    expect(await markEnquiryRead(fixture.businessId, replied.id)).toBe(
      "unchanged",
    );
    expect(await markEnquiryRead(fixture.businessId, fresh.id)).toBe("updated");
    expect(await markEnquiryRead(fixture.businessId, fresh.id)).toBe(
      "unchanged",
    );
    expect((await getInboxEnquiry(fixture.businessId, fresh.id))?.status).toBe(
      "read",
    );
    expect(
      (await getInboxEnquiry(fixture.businessId, replied.id))?.status,
    ).toBe("replied");
  });

  it("changes statuses in bulk with retention, skipping other businesses and replied rows", async () => {
    const a = await add({ status: "new" });
    const b = await add({ status: "read" });
    const replied = await add({ status: "replied" });
    const foreign = await add({ status: "new" }, fixture.otherBusinessId);

    const archived = await bulkSetEnquiryStatus({
      businessId: fixture.businessId,
      enquiryIds: [a.id, b.id, foreign.id],
      status: "archived",
    });
    expect(archived).toEqual({ status: "updated", updated: 2, skipped: 1 });
    const stored = await getInboxEnquiry(fixture.businessId, a.id);
    expect(stored?.status).toBe("archived");
    const [row] = await getDatabase()
      .select({ expiry: businessEnquiry.retentionExpiresAt })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, a.id));
    const days = (row!.expiry!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThan(366);
    expect(
      (await getInboxEnquiry(fixture.otherBusinessId, foreign.id))?.status,
    ).toBe("new");

    const reopened = await bulkSetEnquiryStatus({
      businessId: fixture.businessId,
      enquiryIds: [replied.id, a.id],
      status: "read",
    });
    expect(reopened).toEqual({ status: "updated", updated: 1, skipped: 1 });
    expect(
      (await getInboxEnquiry(fixture.businessId, replied.id))?.status,
    ).toBe("replied");

    const spam = await bulkSetEnquiryStatus({
      businessId: fixture.businessId,
      enquiryIds: [replied.id],
      status: "spam",
    });
    expect(spam).toMatchObject({ updated: 1 });
    const [spamRow] = await getDatabase()
      .select({ expiry: businessEnquiry.retentionExpiresAt })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.id, replied.id));
    expect((spamRow!.expiry!.getTime() - Date.now()) / 86_400_000).toBeLessThan(
      31,
    );
  });

  it("rejects an empty selection", async () => {
    expect(
      await bulkSetEnquiryStatus({
        businessId: fixture.businessId,
        enquiryIds: [],
        status: "closed",
      }),
    ).toEqual({ status: "invalid" });
  });
});
