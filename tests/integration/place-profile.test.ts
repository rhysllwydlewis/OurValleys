import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeProfile } from "@/lib/database/schema/reference";
import { createPlaceForAdmin } from "@/modules/reference-data/admin-places";
import {
  getPlaceProfile,
  getPlaceProfileForAdmin,
  savePlaceProfileForAdmin,
} from "@/modules/reference-data/place-profile";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;
const slug = "fixture-place-profile-slug";

async function makePlace(): Promise<string> {
  const created = await createPlaceForAdmin({
    canonicalName: "Fixture Profile Place",
    slug,
    placeType: "town",
    editorialSummary: "A fictional place created by automated tests.",
  });
  if (created.status !== "created") throw new Error("Expected created");
  return created.id;
}

describeDatabase("place profiles", () => {
  afterEach(async () => {
    // The profile row goes with the place (cascade).
    await getDatabase().delete(place).where(eq(place.slug, slug));
  });
  afterAll(async () => {
    await closeDatabase();
  });

  it("has no profile until one is saved", async () => {
    const placeId = await makePlace();
    expect(await getPlaceProfile(placeId)).toBeNull();
    const admin = await getPlaceProfileForAdmin(placeId);
    expect(admin.state).toBe("ready");
    if (admin.state === "ready") {
      expect(admin.profile.facts).toEqual([]);
      expect(admin.updatedAt).toBeNull();
    }
  });

  it("saves, reads back and normalises blanks", async () => {
    const placeId = await makePlace();
    const saved = await savePlaceProfileForAdmin(
      {
        placeId,
        welshSummary: "  Crynodeb  ",
        about: "About text.\n\nSecond paragraph.",
        aboutCy: "   ",
        facts: [{ label: "Market day", value: "Saturday", valueCy: "Sadwrn" }],
      },
      null,
    );
    expect(saved).toEqual({ status: "saved", slug });
    const profile = await getPlaceProfile(placeId);
    expect(profile).toEqual({
      welshSummary: "Crynodeb",
      about: "About text.\n\nSecond paragraph.",
      aboutCy: null,
      facts: [
        {
          label: "Market day",
          labelCy: "",
          value: "Saturday",
          valueCy: "Sadwrn",
        },
      ],
    });
  });

  it("replaces a saved profile and stores nothing for an unknown place", async () => {
    const placeId = await makePlace();
    const saved = await savePlaceProfileForAdmin(
      { placeId, about: "One.", facts: [{ label: "A", value: "B" }] },
      null,
    );
    expect(saved).toEqual({ status: "saved", slug });
    const replaced = await savePlaceProfileForAdmin(
      { placeId, welshSummary: "Cymraeg", facts: [] },
      null,
    );
    expect(replaced.status).toBe("saved");
    const profile = await getPlaceProfile(placeId);
    expect(profile).toMatchObject({
      welshSummary: "Cymraeg",
      about: null,
      facts: [],
    });

    const missing = await savePlaceProfileForAdmin(
      { placeId: "00000000-0000-4000-8000-0000000000aa", about: "Orphan" },
      null,
    );
    expect(missing).toEqual({ status: "not_found" });
  });

  it("rejects invalid input and malformed ids without writing", async () => {
    const placeId = await makePlace();
    expect(
      await savePlaceProfileForAdmin(
        { placeId, about: "x".repeat(3001) },
        null,
      ),
    ).toEqual({ status: "invalid" });
    expect(await getPlaceProfileForAdmin("not-a-uuid")).toEqual({
      state: "not_found",
    });
    const rows = await getDatabase()
      .select()
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId));
    expect(rows).toHaveLength(0);
  });

  it("deletes the profile with its place", async () => {
    const placeId = await makePlace();
    await savePlaceProfileForAdmin({ placeId, about: "Gone soon." }, null);
    await getDatabase().delete(place).where(eq(place.id, placeId));
    expect(await getPlaceProfile(placeId)).toBeNull();
  });
});
