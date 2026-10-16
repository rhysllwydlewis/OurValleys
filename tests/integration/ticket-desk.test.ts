import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { businessTicket } from "@/lib/database/schema/business-operations";
import {
  getTicketDeskDetail,
  listTicketsForDesk,
} from "@/modules/businesses/ticket-desk-data";
import {
  createBusinessTicket,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002501",
  businessA: "00000000-0000-4000-8000-000000002502",
  businessB: "00000000-0000-4000-8000-000000002503",
  ownerId: "00000000-0000-4000-8000-000000002504",
  adminId: "00000000-0000-4000-8000-000000002505",
  claimantId: "00000000-0000-4000-8000-000000002506",
} as const;
const businessIds = [fixture.businessA, fixture.businessB];
const userIds = [fixture.ownerId, fixture.adminId, fixture.claimantId];

describeDatabase("resolution desk data", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Desk Owner",
        email: "desk.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.adminId,
        name: "Desk Admin",
        email: "desk.admin@example.test",
        emailVerified: true,
        role: "admin",
      },
      {
        id: fixture.claimantId,
        name: "Desk Claimant",
        email: "desk.claimant@example.test",
        emailVerified: false,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Desk fixtures",
      slug: "desk-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessA, "Desk Fixture A", "desk-fixture-a"],
        [fixture.businessB, "Desk Fixture B", "desk-fixture-b"],
      ].map(([id, tradingName, slug]) => ({
        id: id!,
        tradingName: tradingName!,
        slug: slug!,
        summary: "A fictional business used only by desk tests.",
        description: "A fictional business used only by desk tests.",
        publicPhone: "01443 000000",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "draft",
        createdByUserId: fixture.ownerId,
      })),
    );
    await database.insert(businessMembership).values({
      businessId: fixture.businessA,
      userId: fixture.ownerId,
      role: "owner",
      permissions: [],
      status: "active",
    });
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

  async function claim() {
    const created = await createBusinessTicket({
      businessId: fixture.businessA,
      reporterUserId: fixture.claimantId,
      reporterEmail: "desk.claimant@example.test",
      type: "claim",
      reason: "I help run this business and want access.",
      evidence: { claimedRole: "Manager", note: "Happy to send proof" },
    });
    if (created.status !== "created") throw new Error(created.status);
    return created.ticketId;
  }

  it("returns the claimant, the team and the evidence for one ticket", async () => {
    const ticketId = await claim();
    const result = await getTicketDeskDetail(ticketId);
    if (result.state !== "ready") throw new Error(result.state);
    const { detail } = result;
    expect(detail.ticket.type).toBe("claim");
    expect(detail.business.name).toBe("Desk Fixture A");
    expect(detail.business.current.publicPhone).toBe("01443 000000");
    expect(detail.claimant).toMatchObject({
      name: "Desk Claimant",
      emailVerified: false,
    });
    expect(detail.team.map((member) => [member.name, member.role])).toEqual([
      ["Desk Owner", "owner"],
    ]);
    expect(detail.related).toBeNull();
    expect(detail.history.map((entry) => entry.action)).toEqual(["created"]);
  });

  it("lists other open tickets on the same business, not itself or closed ones", async () => {
    const first = await claim();
    const second = await claim();
    const done = await claim();
    await resolveBusinessTicket({
      adminUserId: fixture.adminId,
      ticketId: done,
      action: "dismiss",
      note: "Duplicate of another claim.",
    });
    const result = await getTicketDeskDetail(first);
    if (result.state !== "ready") throw new Error(result.state);
    expect(result.detail.otherOpenTickets.map((t) => t.id)).toEqual([second]);
  });

  it("shows the decision history with who made it", async () => {
    const ticketId = await claim();
    const decided = await resolveBusinessTicket({
      adminUserId: fixture.adminId,
      ticketId,
      action: "request_information",
      note: "Please send an invoice.",
    });
    expect(decided.status).toBe("resolved");
    const result = await getTicketDeskDetail(ticketId);
    if (result.state !== "ready") throw new Error(result.state);
    expect(result.detail.ticket.status).toBe("awaiting_information");
    expect(result.detail.history).toMatchObject([
      {
        action: "request_information",
        note: "Please send an invoice.",
        actorName: "Desk Admin",
      },
      { action: "created", actorName: "Desk Claimant" },
    ]);
  });

  it("describes a related business for a duplicate", async () => {
    const created = await createBusinessTicket({
      businessId: fixture.businessA,
      relatedBusinessId: fixture.businessB,
      type: "duplicate",
      reason: "These two look like the same business.",
      riskLevel: "high",
    });
    if (created.status !== "created") throw new Error(created.status);
    const result = await getTicketDeskDetail(created.ticketId);
    if (result.state !== "ready") throw new Error(result.state);
    expect(result.detail.related).toMatchObject({
      name: "Desk Fixture B",
      slug: "desk-fixture-b",
      teamCount: 0,
    });
    expect(result.detail.ticket.riskLevel).toBe("high");
  });

  it("reports an unknown ticket as missing and never throws", async () => {
    expect(
      await getTicketDeskDetail("00000000-0000-4000-8000-0000000025ff"),
    ).toEqual({ state: "missing" });
  });

  it("lists active tickets oldest first and closed ones separately", async () => {
    const open = await claim();
    const closed = await claim();
    await resolveBusinessTicket({
      adminUserId: fixture.adminId,
      ticketId: closed,
      action: "reject",
      note: "Not enough evidence.",
    });
    const mine = (tickets: { id: string }[]) =>
      tickets
        .map((ticket) => ticket.id)
        .filter((id) => [open, closed].includes(id));

    expect(mine((await listTicketsForDesk("active")).tickets)).toEqual([open]);
    expect(mine((await listTicketsForDesk("closed")).tickets)).toEqual([
      closed,
    ]);
    expect(mine((await listTicketsForDesk("all")).tickets).sort()).toEqual(
      [open, closed].sort(),
    );
  });
});
