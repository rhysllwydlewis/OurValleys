import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { place } from "@/lib/database/schema/business";
import { placeSuggestion } from "@/lib/database/schema/reference";
import { createPlaceForAdmin } from "@/modules/reference-data/admin-places";
import {
  getPlaceProfile,
  savePlaceProfileForAdmin,
} from "@/modules/reference-data/place-profile";
import {
  countPlaceSuggestionsByStatus,
  listPlaceSuggestions,
  resolvePlaceSuggestion,
  submitPlaceSuggestion,
} from "@/modules/reference-data/place-suggestions";
import { purgePlatformData } from "@/modules/platform/data-retention";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;
const slug = "fixture-place-suggestion-slug";
const adminId = crypto.randomUUID();

async function makePlace(): Promise<string> {
  const created = await createPlaceForAdmin({
    canonicalName: "Fixture Suggestion Place",
    slug,
    placeType: "town",
    editorialSummary: "A fictional place created by automated tests.",
  });
  if (created.status !== "created") throw new Error("Expected created");
  return created.id;
}

async function latestId(placeId: string): Promise<string> {
  const [row] = await getDatabase()
    .select({ id: placeSuggestion.id })
    .from(placeSuggestion)
    .where(eq(placeSuggestion.placeId, placeId))
    .orderBy(placeSuggestion.createdAt)
    .limit(1);
  if (!row) throw new Error("no suggestion");
  return row.id;
}

describeDatabase("place suggestions", () => {
  afterEach(async () => {
    await getDatabase().delete(place).where(eq(place.slug, slug));
  });
  beforeAll(async () => {
    await getDatabase().insert(user).values({
      id: adminId,
      name: "Place Suggestion Fixture Admin",
      email: "admin@place-suggestion-fixture.test",
      emailVerified: true,
      role: "admin",
    });
  });
  afterAll(async () => {
    await getDatabase().delete(user).where(eq(user.id, adminId));
    await closeDatabase();
  });

  it("stores a suggestion privately and lists it for admins", async () => {
    const placeId = await makePlace();
    expect(
      await submitPlaceSuggestion({
        placeSlug: slug,
        kind: "fact",
        factLabel: "Market day",
        message: "Thursdays",
      }),
    ).toEqual({ status: "submitted" });
    const listed = await listPlaceSuggestions("new");
    expect(listed.state).toBe("ready");
    if (listed.state === "ready") {
      const mine = listed.suggestions.filter((s) => s.placeId === placeId);
      expect(mine).toHaveLength(1);
      expect(mine[0]).toMatchObject({ factLabel: "Market day", status: "new" });
    }
    // Nothing is published: no profile appears until an admin applies it.
    expect(await getPlaceProfile(placeId)).toBeNull();
    const counts = await countPlaceSuggestionsByStatus();
    expect(counts?.new).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid input, unknown places and inactive places", async () => {
    await makePlace();
    expect(
      await submitPlaceSuggestion({
        placeSlug: slug,
        kind: "fact",
        message: "x",
      }),
    ).toEqual({ status: "invalid" });
    expect(
      await submitPlaceSuggestion({
        placeSlug: "no-such-place-zzz",
        kind: "other",
        message: "Hello there",
      }),
    ).toEqual({ status: "not_found" });
    await getDatabase()
      .update(place)
      .set({ status: "inactive" })
      .where(eq(place.slug, slug));
    expect(
      await submitPlaceSuggestion({
        placeSlug: slug,
        kind: "other",
        message: "Hello there",
      }),
    ).toEqual({ status: "not_found" });
  });

  it("adds an accepted fact to the profile once, keeping existing content", async () => {
    const placeId = await makePlace();
    await savePlaceProfileForAdmin(
      {
        placeId,
        about: "About text",
        facts: [{ label: "Parking", value: "Free" }],
      },
      null,
    );
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "fact",
      factLabel: "Market day",
      message: "Thursdays",
    });
    const id = await latestId(placeId);
    const input = { suggestionId: id, outcome: "applied", addAsFact: true };
    expect(await resolvePlaceSuggestion(input, adminId)).toMatchObject({
      status: "resolved",
      addedFact: true,
    });
    const profile = await getPlaceProfile(placeId);
    expect(profile?.about).toBe("About text");
    expect(profile?.facts.map((f) => f.label)).toEqual([
      "Parking",
      "Market day",
    ]);
    // A second decision (double click, second admin) changes nothing.
    expect(await resolvePlaceSuggestion(input, crypto.randomUUID())).toEqual({
      status: "already_decided",
    });
    expect((await getPlaceProfile(placeId))?.facts).toHaveLength(2);
  });

  it("creates a profile when the place has none", async () => {
    const placeId = await makePlace();
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "fact",
      factLabel: "Bus",
      message: "Route 120",
    });
    await resolvePlaceSuggestion(
      {
        suggestionId: await latestId(placeId),
        outcome: "applied",
        addAsFact: true,
      },
      adminId,
    );
    expect((await getPlaceProfile(placeId))?.facts).toHaveLength(1);
  });

  it("leaves the suggestion open when a duplicate heading or a full profile refuses it", async () => {
    const placeId = await makePlace();
    await savePlaceProfileForAdmin(
      { placeId, facts: [{ label: "parking", value: "Free" }] },
      null,
    );
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "fact",
      factLabel: "Parking",
      message: "Pay and display",
    });
    const id = await latestId(placeId);
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: id, outcome: "applied", addAsFact: true },
        adminId,
      ),
    ).toEqual({ status: "duplicate_fact" });
    const [row] = await getDatabase()
      .select({ status: placeSuggestion.status })
      .from(placeSuggestion)
      .where(eq(placeSuggestion.id, id));
    expect(row?.status).toBe("new");

    await savePlaceProfileForAdmin(
      {
        placeId,
        facts: Array.from({ length: 8 }, (_, i) => ({
          label: `F${i}`,
          value: "v",
        })),
      },
      null,
    );
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: id, outcome: "applied", addAsFact: true },
        adminId,
      ),
    ).toEqual({ status: "profile_full" });
  });

  it("refuses to add a non-fact, dismiss-with-add, and unknown or malformed ids", async () => {
    const placeId = await makePlace();
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "correction",
      message: "The library moved",
    });
    const id = await latestId(placeId);
    const admin = adminId;
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: id, outcome: "applied", addAsFact: true },
        admin,
      ),
    ).toEqual({ status: "invalid" });
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: id, outcome: "dismissed", addAsFact: true },
        admin,
      ),
    ).toEqual({ status: "invalid" });
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: "nope", outcome: "applied" },
        admin,
      ),
    ).toEqual({ status: "invalid" });
    expect(
      await resolvePlaceSuggestion(
        { suggestionId: crypto.randomUUID(), outcome: "applied" },
        admin,
      ),
    ).toEqual({ status: "not_found" });
    expect(await getPlaceProfile(placeId)).toBeNull();
  });

  it("deletes decided suggestions after twelve months but keeps waiting ones", async () => {
    const placeId = await makePlace();
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "other",
      message: "Old decided one",
    });
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "other",
      message: "Old waiting one",
    });
    const rows = await getDatabase()
      .select({ id: placeSuggestion.id, message: placeSuggestion.message })
      .from(placeSuggestion)
      .where(eq(placeSuggestion.placeId, placeId));
    const decided = rows.find((r) => r.message.includes("decided"))!;
    const old = new Date(Date.now() - 400 * 86_400_000);
    await getDatabase()
      .update(placeSuggestion)
      .set({ createdAt: old })
      .where(eq(placeSuggestion.placeId, placeId));
    await resolvePlaceSuggestion(
      { suggestionId: decided.id, outcome: "dismissed" },
      adminId,
    );
    // Decided just now: kept, however long it waited in the queue.
    expect((await purgePlatformData()).placeSuggestions).toBe(0);
    await getDatabase()
      .update(placeSuggestion)
      .set({ reviewedAt: old })
      .where(eq(placeSuggestion.id, decided.id));
    const result = await purgePlatformData();
    expect(result.placeSuggestions).toBeGreaterThanOrEqual(1);
    const left = await getDatabase()
      .select({ message: placeSuggestion.message })
      .from(placeSuggestion)
      .where(eq(placeSuggestion.placeId, placeId));
    expect(left.map((r) => r.message)).toEqual(["Old waiting one"]);
  });

  it("cascades with the place", async () => {
    const placeId = await makePlace();
    await submitPlaceSuggestion({
      placeSlug: slug,
      kind: "other",
      message: "Hello there",
    });
    await getDatabase().delete(place).where(eq(place.id, placeId));
    const left = await getDatabase()
      .select({ id: placeSuggestion.id })
      .from(placeSuggestion)
      .where(eq(placeSuggestion.placeId, placeId));
    expect(left).toHaveLength(0);
  });
});
