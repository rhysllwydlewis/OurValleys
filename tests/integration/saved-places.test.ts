import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { savedPlace } from "@/lib/database/schema/saved-discovery";
import {
  listSavedDiscoveryForUser,
  listSavedPlaceIdsForUser,
  removePlaceForUser,
  savePlaceForUser,
} from "@/modules/residents/saved-discovery";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000101",
  placeId: "00000000-0000-4000-8000-000000000301",
  placeSlug: "tonypandy",
} as const;

describeDatabase("saved places", () => {
  afterEach(async () => {
    await getDatabase()
      .delete(savedPlace)
      .where(
        and(
          eq(savedPlace.userId, fixture.userId),
          eq(savedPlace.placeId, fixture.placeId),
        ),
      );
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("saves and lists a place for a resident", async () => {
    const outcome = await savePlaceForUser(fixture.userId, fixture.placeId);
    expect(outcome).toBe("saved");

    const ids = await listSavedPlaceIdsForUser(fixture.userId);
    expect(ids).toContain(fixture.placeId);

    const discovery = await listSavedDiscoveryForUser(fixture.userId);
    expect(discovery.state).toBe("ready");
    if (discovery.state !== "ready") return;
    expect(discovery.places.map((entry) => entry.id)).toContain(
      fixture.placeId,
    );
    expect(
      discovery.places.find((entry) => entry.id === fixture.placeId)?.slug,
    ).toBe(fixture.placeSlug);
  });

  it("does not duplicate a place saved twice", async () => {
    await savePlaceForUser(fixture.userId, fixture.placeId);
    const second = await savePlaceForUser(fixture.userId, fixture.placeId);
    expect(second).toBe("already_saved");

    const ids = await listSavedPlaceIdsForUser(fixture.userId);
    expect(ids.filter((id) => id === fixture.placeId)).toHaveLength(1);
  });

  it("removes a saved place", async () => {
    await savePlaceForUser(fixture.userId, fixture.placeId);
    const outcome = await removePlaceForUser(fixture.userId, fixture.placeId);
    expect(outcome).toBe("removed");

    const ids = await listSavedPlaceIdsForUser(fixture.userId);
    expect(ids).not.toContain(fixture.placeId);
  });

  it("reports not_found when removing a place that was never saved", async () => {
    const outcome = await removePlaceForUser(fixture.userId, fixture.placeId);
    expect(outcome).toBe("not_found");
  });
});
