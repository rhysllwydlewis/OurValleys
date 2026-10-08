import { afterAll, describe, expect, it } from "vitest";
import { eq, ilike } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { businessSuggestion } from "@/lib/database/schema/business-operations";
import { purgePlatformData } from "@/modules/platform/data-retention";
import {
  listBusinessSuggestions,
  reviewBusinessSuggestion,
  submitBusinessSuggestion,
} from "@/modules/businesses/suggestions";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;
const prefix = "Suggestion Fixture";
const adminUserId = crypto.randomUUID();

describeDatabase("business suggestions", () => {
  afterAll(async () => {
    await getDatabase()
      .delete(businessSuggestion)
      .where(ilike(businessSuggestion.name, `${prefix}%`));
    await getDatabase().delete(user).where(eq(user.id, adminUserId));
    await closeDatabase();
  });

  it("stores suggestions privately and groups repeats", async () => {
    const name = `${prefix} Bakery`;
    expect(
      await submitBusinessSuggestion({ name, placeText: "Aberdare" }),
    ).toEqual({ status: "submitted" });
    expect(
      await submitBusinessSuggestion({
        name: name.toUpperCase(),
        placeText: "aberdare",
        contactEmail: "resident@example.com",
      }),
    ).toEqual({ status: "submitted" });
    expect(await submitBusinessSuggestion({ name: "x" })).toEqual({
      status: "invalid",
    });

    const listed = await listBusinessSuggestions("new");
    expect(listed.state).toBe("ready");
    const mine =
      listed.state === "ready"
        ? listed.suggestions.filter(
            (row) => row.name.toLowerCase() === name.toLowerCase(),
          )
        : [];
    expect(mine).toHaveLength(2);
    expect(mine.every((row) => row.sameCount === 2)).toBe(true);
  });

  it("lets an admin change status and reports unknown ids", async () => {
    await submitBusinessSuggestion({
      name: `${prefix} Plumber`,
      placeText: "Ferndale",
    });
    const [row] = await getDatabase()
      .select()
      .from(businessSuggestion)
      .where(eq(businessSuggestion.name, `${prefix} Plumber`));
    expect(row?.status).toBe("new");

    await getDatabase().insert(user).values({
      id: adminUserId,
      name: "Suggestion Fixture Admin",
      email: "admin@suggestion-fixture.test",
      emailVerified: true,
      role: "admin",
    });
    expect(
      await reviewBusinessSuggestion({
        suggestionId: row!.id,
        status: "seeded",
        adminUserId,
      }),
    ).toEqual({ status: "updated" });
    const [after] = await getDatabase()
      .select()
      .from(businessSuggestion)
      .where(eq(businessSuggestion.id, row!.id));
    expect(after?.status).toBe("seeded");
    expect(after?.reviewedByUserId).toBe(adminUserId);

    expect(
      await reviewBusinessSuggestion({
        suggestionId: crypto.randomUUID(),
        status: "rejected",
        adminUserId,
      }),
    ).toEqual({ status: "not_found" });
  });

  it("purges suggestions older than twelve months", async () => {
    const database = getDatabase();
    const old = new Date();
    old.setUTCMonth(old.getUTCMonth() - 13);
    await database.insert(businessSuggestion).values({
      name: `${prefix} Old`,
      placeText: "Mountain Ash",
      dedupeKey: "suggestion fixture old|mountain ash",
      createdAt: old,
    });
    const result = await purgePlatformData(new Date());
    expect(result.businessSuggestions).toBeGreaterThanOrEqual(1);
    const rows = await database
      .select()
      .from(businessSuggestion)
      .where(eq(businessSuggestion.name, `${prefix} Old`));
    expect(rows).toHaveLength(0);
  });
});
