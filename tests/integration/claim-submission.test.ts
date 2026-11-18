import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessTicket } from "@/lib/database/schema/business-operations";
import { submitBusinessClaim } from "@/modules/businesses/tickets";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000005601",
  published: "00000000-0000-4000-8000-000000005602",
  otherPublished: "00000000-0000-4000-8000-000000005603",
  draft: "00000000-0000-4000-8000-000000005604",
  claimantId: "00000000-0000-4000-8000-000000005605",
  rivalId: "00000000-0000-4000-8000-000000005606",
  unknown: "00000000-0000-4000-8000-000000005699",
} as const;
const businessIds = [fixture.published, fixture.otherPublished, fixture.draft];
const userIds = [fixture.claimantId, fixture.rivalId];

function claim(businessId: string, reporterUserId: string) {
  return submitBusinessClaim({
    businessId,
    reporterUserId,
    reporterEmail: "claim.fixture@example.test",
    reason: "I help run this business and want access.",
    evidence: { claimedRole: "Manager" },
  });
}

async function ticketsFor(businessId: string, reporterUserId: string) {
  return getDatabase()
    .select({ id: businessTicket.id, status: businessTicket.status })
    .from(businessTicket)
    .where(
      and(
        eq(businessTicket.businessId, businessId),
        eq(businessTicket.reporterUserId, reporterUserId),
      ),
    );
}

describeDatabase("submitting an ownership claim", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.claimantId,
        name: "Claim Fixture One",
        email: "claim.one@example.test",
        emailVerified: true,
      },
      {
        id: fixture.rivalId,
        name: "Claim Fixture Two",
        email: "claim.two@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Claim fixtures",
      slug: "claim-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.published, "Claim Fixture A", "claim-fixture-a", "published"],
        [
          fixture.otherPublished,
          "Claim Fixture B",
          "claim-fixture-b",
          "published",
        ],
        [fixture.draft, "Claim Fixture Draft", "claim-fixture-draft", "draft"],
      ].map(([id, tradingName, slug, status]) => ({
        id: id!,
        tradingName: tradingName!,
        slug: slug!,
        summary: "A fictional business used only by claim tests.",
        description: "A fictional business used only by claim tests.",
        publicPhone: "01443 000000",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: status!,
        createdByUserId: fixture.claimantId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessTicket)
      .where(inArray(businessTicket.businessId, businessIds));
    await database.delete(business).where(inArray(business.id, businessIds));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(inArray(user.id, userIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("files a claim for a publicly listed business", async () => {
    const result = await claim(fixture.published, fixture.claimantId);
    expect(result.status).toBe("created");
    expect(
      await ticketsFor(fixture.published, fixture.claimantId),
    ).toHaveLength(1);
  });

  it("refuses a business that is not publicly listed, and files nothing", async () => {
    const result = await claim(fixture.draft, fixture.claimantId);
    expect(result.status).toBe("not_found");
    expect(await ticketsFor(fixture.draft, fixture.claimantId)).toHaveLength(0);
  });

  it("refuses a business that does not exist", async () => {
    const result = await claim(fixture.unknown, fixture.claimantId);
    expect(result.status).toBe("not_found");
  });

  it("tells an account its claim is already waiting instead of filing a second", async () => {
    const first = await claim(fixture.published, fixture.claimantId);
    if (first.status !== "created") throw new Error(first.status);

    const second = await claim(fixture.published, fixture.claimantId);
    expect(second).toEqual({
      status: "already_open",
      ticketId: first.ticketId,
    });
    expect(
      await ticketsFor(fixture.published, fixture.claimantId),
    ).toHaveLength(1);
  });

  it("lets a different account file its own claim on the same business", async () => {
    await claim(fixture.published, fixture.claimantId);
    const rival = await claim(fixture.published, fixture.rivalId);
    expect(rival.status).toBe("created");
  });

  it("lets the same account claim a different business", async () => {
    await claim(fixture.published, fixture.claimantId);
    const other = await claim(fixture.otherPublished, fixture.claimantId);
    expect(other.status).toBe("created");
  });

  it("accepts a new submission once the team has asked for more information", async () => {
    const first = await claim(fixture.published, fixture.claimantId);
    if (first.status !== "created") throw new Error(first.status);
    await getDatabase()
      .update(businessTicket)
      .set({ status: "awaiting_information" })
      .where(eq(businessTicket.id, first.ticketId));

    const answer = await claim(fixture.published, fixture.claimantId);
    expect(answer.status).toBe("created");
  });

  it("accepts a new claim after the earlier one was decided", async () => {
    const first = await claim(fixture.published, fixture.claimantId);
    if (first.status !== "created") throw new Error(first.status);
    await getDatabase()
      .update(businessTicket)
      .set({ status: "rejected" })
      .where(eq(businessTicket.id, first.ticketId));

    const again = await claim(fixture.published, fixture.claimantId);
    expect(again.status).toBe("created");
  });
});
