import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import {
  business,
  businessTranslation,
  category,
  service,
  serviceTranslation,
} from "@/lib/database/schema/business";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import {
  readEnglishBusinessText,
  readPublicWelshContent,
  readWelshContent,
  saveBusinessTranslation,
} from "@/modules/businesses/translations";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

// The seeded published fixture business (cwm-coil-heating).
const seeded = "00000000-0000-4000-8000-000000000401";
const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000961",
  otherBusinessId: "00000000-0000-4000-8000-000000000962",
  otherServiceId: "00000000-0000-4000-8000-000000000963",
  actorUserId: null as string | null,
} as const;

async function clearSeeded() {
  const database = getDatabase();
  await database
    .delete(businessTranslation)
    .where(eq(businessTranslation.businessId, seeded));
  const services = await database
    .select({ id: service.id })
    .from(service)
    .where(eq(service.businessId, seeded));
  for (const row of services) {
    await database
      .delete(serviceTranslation)
      .where(eq(serviceTranslation.serviceId, row.id));
  }
}

describeDatabase("business translation", () => {
  beforeEach(async () => {
    await clearSeeded();
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture translation services",
      slug: "fixture-translation-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.otherBusinessId,
      tradingName: "Fixture other translator",
      slug: "fixture-other-translator",
      summary: "A fictional business used only by translation tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
    });
    await database.insert(service).values({
      id: fixture.otherServiceId,
      businessId: fixture.otherBusinessId,
      name: "Other service",
      description: "Other service description",
    });
  });

  afterEach(async () => {
    await clearSeeded();
    const database = getDatabase();
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function actor() {
    const [row] = await getDatabase().query.user.findMany({ limit: 1 });
    return row?.id ?? "00000000-0000-4000-8000-000000000000";
  }

  it("starts empty and lists the business's own active services", async () => {
    const content = await readWelshContent(seeded);
    expect(content.translation).toMatchObject({
      summary: null,
      description: null,
      services: {},
    });
    expect(content.services.length).toBeGreaterThan(0);
    expect(content.serviceIdsByName.size).toBe(content.services.length);
  });

  it("saves, reads back, updates in place and clears blank fields", async () => {
    const content = await readWelshContent(seeded);
    const first = content.services[0]!;
    const userId = await actor();

    expect(
      await saveBusinessTranslation({
        businessId: seeded,
        actorUserId: userId,
        value: {
          summary: "Gwasanaeth gwresogi olew lleol",
          description: null,
          services: {
            [first.id]: { name: "Gwasanaeth boeler", description: "Blynyddol" },
          },
        },
      }),
    ).toEqual({ status: "saved" });

    let after = await readWelshContent(seeded);
    expect(after.translation.summary).toBe("Gwasanaeth gwresogi olew lleol");
    expect(after.translation.description).toBeNull();
    expect(after.translation.services[first.id]).toEqual({
      name: "Gwasanaeth boeler",
      description: "Blynyddol",
    });
    expect(after.translation.updatedAt).toBeInstanceOf(Date);

    await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: userId,
      value: {
        summary: "Diweddarwyd",
        description: "Disgrifiad hir",
        services: { [first.id]: { name: null, description: null } },
      },
    });
    after = await readWelshContent(seeded);
    expect(after.translation.summary).toBe("Diweddarwyd");
    expect(after.translation.description).toBe("Disgrifiad hir");
    expect(after.translation.services[first.id]).toBeUndefined();
    const rows = await getDatabase()
      .select()
      .from(businessTranslation)
      .where(eq(businessTranslation.businessId, seeded));
    expect(rows).toHaveLength(1);

    await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: userId,
      value: { summary: null, description: null, services: {} },
    });
    expect((await readWelshContent(seeded)).translation.summary).toBeNull();
    expect(
      await getDatabase()
        .select()
        .from(businessTranslation)
        .where(eq(businessTranslation.businessId, seeded)),
    ).toHaveLength(0);
  });

  it("never writes into another business's service (tenant isolation)", async () => {
    const result = await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: await actor(),
      value: {
        summary: "Cymraeg",
        description: null,
        services: {
          [fixture.otherServiceId]: { name: "Ymosodiad", description: null },
        },
      },
    });
    expect(result).toEqual({ status: "saved" });
    const leaked = await getDatabase()
      .select()
      .from(serviceTranslation)
      .where(eq(serviceTranslation.serviceId, fixture.otherServiceId));
    expect(leaked).toHaveLength(0);
    // And the other business sees nothing of the seeded business's Welsh.
    const other = await readWelshContent(fixture.otherBusinessId);
    expect(other.translation.summary).toBeNull();
  });

  it("answers 'missing' for an unknown business and refuses over-long text at the database", async () => {
    expect(
      await saveBusinessTranslation({
        businessId: "00000000-0000-4000-8000-0000000009ff",
        actorUserId: await actor(),
        value: { summary: "Cymraeg", description: null, services: {} },
      }),
    ).toEqual({ status: "missing" });

    expect(
      await saveBusinessTranslation({
        businessId: seeded,
        actorUserId: await actor(),
        value: { summary: "a".repeat(281), description: null, services: {} },
      }),
    ).toEqual({ status: "unavailable" });
    expect((await readWelshContent(seeded)).translation.summary).toBeNull();
  });

  it("rolls back the whole save when one part fails", async () => {
    const content = await readWelshContent(seeded);
    const first = content.services[0]!;
    const result = await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: await actor(),
      value: {
        summary: "Dylai gael ei ddadwneud",
        description: null,
        services: { [first.id]: { name: "n".repeat(101), description: null } },
      },
    });
    expect(result).toEqual({ status: "unavailable" });
    expect((await readWelshContent(seeded)).translation.summary).toBeNull();
  });

  it("falls back to no Welsh for the public reader when the database fails", async () => {
    const content = await readPublicWelshContent("not-a-uuid");
    expect(content.translation.summary).toBeNull();
    expect(content.services).toEqual([]);
  });

  it("cascades with the business and the service", async () => {
    await saveBusinessTranslation({
      businessId: fixture.otherBusinessId,
      actorUserId: await actor(),
      value: {
        summary: "Cymraeg",
        description: null,
        services: {
          [fixture.otherServiceId]: { name: "Enw", description: null },
        },
      },
    });
    await getDatabase()
      .delete(service)
      .where(eq(service.id, fixture.otherServiceId));
    expect(
      await getDatabase()
        .select()
        .from(serviceTranslation)
        .where(eq(serviceTranslation.serviceId, fixture.otherServiceId)),
    ).toHaveLength(0);
    await getDatabase()
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    expect(
      await getDatabase()
        .select()
        .from(businessTranslation)
        .where(eq(businessTranslation.businessId, fixture.otherBusinessId)),
    ).toHaveLength(0);
  });

  it("reads the English record the editor sits beside", async () => {
    const english = await readEnglishBusinessText(seeded);
    expect(english?.slug).toBe("cwm-coil-heating");
    expect(
      await readEnglishBusinessText("00000000-0000-4000-8000-0000000009fe"),
    ).toBeNull();
    // A database failure is not "missing".
    await expect(readEnglishBusinessText("not-a-uuid")).rejects.toThrow();
  });

  it("stamps the business as updated when Welsh text is saved", async () => {
    const database = getDatabase();
    const read = async () =>
      (
        await database
          .select({ updatedAt: business.updatedAt })
          .from(business)
          .where(eq(business.id, fixture.otherBusinessId))
      )[0]!.updatedAt;
    await database
      .update(business)
      .set({ updatedAt: new Date("2026-01-01T00:00:00Z") })
      .where(eq(business.id, fixture.otherBusinessId));
    await saveBusinessTranslation({
      businessId: fixture.otherBusinessId,
      actorUserId: await actor(),
      value: { summary: "Cymraeg", description: null, services: {} },
    });
    expect((await read()).getTime()).toBeGreaterThan(
      new Date("2026-06-01T00:00:00Z").getTime(),
    );
  });

  it("makes the business findable by its Welsh words and carries the Welsh summary to the card", async () => {
    const before = await listPublishedBusinesses({ query: "hoffusrwydd" });
    if (before.state !== "ready") throw new Error("expected ready");
    expect(before.businesses.some((b) => b.id === seeded)).toBe(false);

    await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: await actor(),
      value: {
        summary: "Hoffusrwydd lleol a boeleri olew yng Nghwm Rhondda",
        description: null,
        services: {},
      },
    });
    const after = await listPublishedBusinesses({ query: "hoffusrwydd" });
    if (after.state !== "ready") throw new Error("expected ready");
    const card = after.businesses.find((b) => b.id === seeded);
    expect(card?.welshSummary).toBe(
      "Hoffusrwydd lleol a boeleri olew yng Nghwm Rhondda",
    );
    // The English summary is untouched.
    expect(card?.summary).not.toContain("Hoffusrwydd");

    // Accents are ignored, as in English search.
    const folded = await listPublishedBusinesses({ query: "nghwm rhondda" });
    if (folded.state !== "ready") throw new Error("expected ready");
    expect(folded.businesses.some((b) => b.id === seeded)).toBe(true);
  });

  it("scores a Welsh-only match so it is not buried under English approximations", async () => {
    await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: await actor(),
      value: {
        summary: "Hoffusrwydd lleol",
        description: null,
        services: {},
      },
    });
    const result = await listPublishedBusinesses({
      query: "hoffusrwydd",
      sort: "relevance",
    });
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.businesses[0]?.id).toBe(seeded);
  });

  it("finds a business by a Welsh service name", async () => {
    const content = await readWelshContent(seeded);
    const first = content.services[0]!;
    await saveBusinessTranslation({
      businessId: seeded,
      actorUserId: await actor(),
      value: {
        summary: null,
        description: null,
        services: {
          [first.id]: {
            name: "Archwiliad blynyddol i foeleri",
            description: null,
          },
        },
      },
    });
    const result = await listPublishedBusinesses({
      query: "archwiliad blynyddol",
    });
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.businesses.some((b) => b.id === seeded)).toBe(true);

    // An archived service's Welsh name must not keep the business discoverable.
    await getDatabase()
      .update(service)
      .set({ status: "archived" })
      .where(and(eq(service.id, first.id)));
    try {
      const hidden = await listPublishedBusinesses({
        query: "archwiliad blynyddol",
      });
      if (hidden.state !== "ready") throw new Error("expected ready");
      expect(hidden.businesses.some((b) => b.id === seeded)).toBe(false);
    } finally {
      await getDatabase()
        .update(service)
        .set({ status: "active" })
        .where(eq(service.id, first.id));
    }
  });
});
