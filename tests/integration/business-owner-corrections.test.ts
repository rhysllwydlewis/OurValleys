import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  businessTicket,
  businessTicketEvent,
} from "@/lib/database/schema/business-operations";
import {
  countOpenOwnerCorrections,
  listOwnerCorrections,
  resolveOwnerCorrection,
} from "@/modules/businesses/corrections";
import { createBusinessTicket } from "@/modules/businesses/tickets";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002301",
  reporterId: "00000000-0000-4000-8000-000000002302",
  categoryId: "00000000-0000-4000-8000-000000002303",
  businessA: "00000000-0000-4000-8000-000000002304",
  businessB: "00000000-0000-4000-8000-000000002305",
} as const;

async function suggest(
  businessId: string,
  overrides: {
    reportReason?: string;
    changes?: Record<string, unknown>;
    notes?: Record<string, unknown>;
    riskLevel?: "standard" | "high";
    email?: string;
  } = {},
) {
  const result = await createBusinessTicket({
    businessId,
    reporterUserId: fixture.reporterId,
    reporterEmail: overrides.email ?? "visitor@example.test",
    type: "correction",
    reason: "The phone number on the page is out of date.",
    riskLevel: overrides.riskLevel ?? "standard",
    evidence: {
      reportReason: overrides.reportReason ?? "incorrect_details",
      ...(overrides.changes ? { changes: overrides.changes } : {}),
      ...(overrides.notes ? { notes: overrides.notes } : {}),
    },
  });
  if (result.status !== "created") throw new Error("ticket not created");
  return result.ticketId;
}

async function readBusiness(id: string) {
  const [row] = await getDatabase()
    .select()
    .from(business)
    .where(eq(business.id, id));
  return row!;
}

async function readTicket(id: string) {
  const [row] = await getDatabase()
    .select()
    .from(businessTicket)
    .where(eq(businessTicket.id, id));
  return row!;
}

describeDatabase("owner corrections storage", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values(
      [
        [fixture.ownerId, "Correction Owner", "correction.owner@example.test"],
        [fixture.reporterId, "Correction Visitor", "visitor@example.test"],
      ].map(([id, name, email]) => ({
        id: id!,
        name: name!,
        email: email!,
        emailVerified: true,
      })),
    );
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Correction fixtures",
      slug: "correction-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Correction ${index === 0 ? "A" : "B"}`,
        slug: `fixture-correction-${index === 0 ? "a" : "b"}`,
        summary: "Old summary.",
        description: "Fictional business used only by automated tests.",
        publicPhone: "01000 000000",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.reporterId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists this business's suggestions without the reporter's identity", async () => {
    await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
      notes: { hours: "Mon–Fri 9–5" },
    });
    await suggest(fixture.businessB, { changes: { publicPhone: "09999" } });

    const list = await listOwnerCorrections(fixture.businessA);
    if (list.state !== "ready") throw new Error("expected ready");
    expect(list.open).toHaveLength(1);
    const item = list.open[0]!;
    expect(item.state).toBe("open");
    expect(item.changes).toEqual({ publicPhone: "01222 333444" });
    expect(item.notes).toEqual({ hours: "Mon–Fri 9–5" });
    expect(item.fields).toEqual([
      {
        key: "publicPhone",
        current: "01000 000000",
        proposed: "01222 333444",
        differs: true,
      },
    ]);
    expect(JSON.stringify(item)).not.toContain("visitor@example.test");
    expect(JSON.stringify(item)).not.toContain(fixture.reporterId);
    expect(await countOpenOwnerCorrections(fixture.businessA)).toBe(1);
  });

  it("never shows the owner admin-only reports", async () => {
    await suggest(fixture.businessA, {
      reportReason: "inappropriate_content",
      riskLevel: "high",
    });
    const list = await listOwnerCorrections(fixture.businessA);
    if (list.state !== "ready") throw new Error("expected ready");
    expect(list.open).toEqual([]);
    expect(await countOpenOwnerCorrections(fixture.businessA)).toBe(0);
  });

  it("applies only the structured fields and records who decided", async () => {
    const ticketId = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444", summary: "A better summary." },
      notes: { hours: "Never applied automatically" },
    });
    const result = await resolveOwnerCorrection({
      businessId: fixture.businessA,
      ticketId,
      actorUserId: fixture.ownerId,
      decision: "apply",
      note: "Thanks, checked.",
    });
    expect(result).toEqual({ status: "applied" });

    const updated = await readBusiness(fixture.businessA);
    expect(updated.publicPhone).toBe("01222 333444");
    expect(updated.summary).toBe("A better summary.");
    const ticket = await readTicket(ticketId);
    expect(ticket.status).toBe("approved");
    expect(ticket.resolutionAction).toBe("owner_applied");
    expect(ticket.resolvedByUserId).toBe(fixture.ownerId);
    const events = await getDatabase()
      .select()
      .from(businessTicketEvent)
      .where(eq(businessTicketEvent.ticketId, ticketId));
    expect(events.map((event) => event.action)).toContain("owner_applied");

    const list = await listOwnerCorrections(fixture.businessA);
    if (list.state !== "ready") throw new Error("expected ready");
    expect(list.open).toEqual([]);
    expect(list.recent[0]?.state).toBe("applied");
  });

  it("refuses to apply a suggestion with nothing structured to apply", async () => {
    const ticketId = await suggest(fixture.businessA, {
      notes: { hours: "Mon–Fri 9–5" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "apply",
      }),
    ).toEqual({ status: "invalid", reason: "nothing_to_apply" });
    expect((await readTicket(ticketId)).status).toBe("open");
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "handled",
      }),
    ).toEqual({ status: "handled" });
    expect((await readTicket(ticketId)).resolutionAction).toBe("owner_handled");
  });

  it("declines without touching the page", async () => {
    const ticketId = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "decline",
      }),
    ).toEqual({ status: "declined" });
    expect((await readBusiness(fixture.businessA)).publicPhone).toBe(
      "01000 000000",
    );
    expect((await readTicket(ticketId)).status).toBe("rejected");
  });

  it("escalates to the admin desk, which keeps it open and out of the owner's count", async () => {
    const ticketId = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "escalate",
        note: "Not sure about this one.",
      }),
    ).toEqual({ status: "escalated" });
    const ticket = await readTicket(ticketId);
    expect(ticket.status).toBe("open");
    expect(ticket.riskLevel).toBe("high");
    expect(await countOpenOwnerCorrections(fixture.businessA)).toBe(0);
    const list = await listOwnerCorrections(fixture.businessA);
    if (list.state !== "ready") throw new Error("expected ready");
    expect(list.open[0]?.state).toBe("with_team");
    // Once with the team the owner can no longer decide it here.
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "apply",
      }),
    ).toEqual({ status: "not_open" });
    expect((await readBusiness(fixture.businessA)).publicPhone).toBe(
      "01000 000000",
    );
  });

  it("cannot decide another business's suggestion, a finished one, or an admin-only report", async () => {
    const otherTicket = await suggest(fixture.businessB, {
      changes: { publicPhone: "09999" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId: otherTicket,
        actorUserId: fixture.ownerId,
        decision: "apply",
      }),
    ).toEqual({ status: "not_found" });
    expect((await readBusiness(fixture.businessB)).publicPhone).toBe(
      "01000 000000",
    );

    const adminOnly = await suggest(fixture.businessA, {
      reportReason: "inappropriate_content",
      riskLevel: "high",
      changes: { summary: "Should never be applied by the owner" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId: adminOnly,
        actorUserId: fixture.ownerId,
        decision: "apply",
      }),
    ).toEqual({ status: "not_open" });

    const done = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
    });
    await resolveOwnerCorrection({
      businessId: fixture.businessA,
      ticketId: done,
      actorUserId: fixture.ownerId,
      decision: "decline",
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId: done,
        actorUserId: fixture.ownerId,
        decision: "apply",
      }),
    ).toEqual({ status: "not_open" });
    expect((await readBusiness(fixture.businessA)).publicPhone).toBe(
      "01000 000000",
    );
  });

  it("rejects an over-long note and an unknown ticket id without changing anything", async () => {
    const ticketId = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
    });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId,
        actorUserId: fixture.ownerId,
        decision: "apply",
        note: "x".repeat(501),
      }),
    ).toEqual({ status: "invalid", reason: "note_too_long" });
    expect(
      await resolveOwnerCorrection({
        businessId: fixture.businessA,
        ticketId: "00000000-0000-4000-8000-00000000ffff",
        actorUserId: fixture.ownerId,
        decision: "decline",
      }),
    ).toEqual({ status: "not_found" });
    expect((await readTicket(ticketId)).status).toBe("open");
  });

  it("only one of two racing decisions wins", async () => {
    const ticketId = await suggest(fixture.businessA, {
      changes: { publicPhone: "01222 333444" },
    });
    const results = await Promise.all(
      (["apply", "decline"] as const).map((decision) =>
        resolveOwnerCorrection({
          businessId: fixture.businessA,
          ticketId,
          actorUserId: fixture.ownerId,
          decision,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "not_open")).toHaveLength(1);
    const [events] = await Promise.all([
      getDatabase()
        .select()
        .from(businessTicketEvent)
        .where(eq(businessTicketEvent.ticketId, ticketId)),
    ]);
    expect(
      events.filter((event) => event.action.startsWith("owner_")),
    ).toHaveLength(1);
  });

  it("returns unavailable for an unknown business", async () => {
    expect(
      await listOwnerCorrections("00000000-0000-4000-8000-00000000fffe"),
    ).toEqual({ state: "unavailable" });
  });
});
