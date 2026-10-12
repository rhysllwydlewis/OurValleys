import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { getValleysMap } from "@/modules/businesses/map";
import { listPublicEvents } from "@/modules/events/public";
import { loadPlaceTree } from "@/modules/reference-data/place-directory";
import {
  ancestorsOf,
  descendantsOf,
  groupByArea,
  viewPlaceDirectory,
} from "@/modules/reference-data/place-tree";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

// The seeded fictional business sits in Tonypandy, inside Rhondda Fawr, inside
// Rhondda Cynon Taf.
const fixture = {
  town: "tonypandy",
  valley: "rhondda-fawr",
  area: "rhondda-cynon-taf",
  otherValley: "rhondda-fach",
  businessSlug: "cwm-coil-heating",
} as const;

describeDatabase("place hierarchy and scope", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("loads the hierarchy with business counts that roll up", async () => {
    const tree = await loadPlaceTree();
    expect(tree).not.toBeNull();
    if (!tree) return;
    const town = tree.bySlug.get(fixture.town)!;
    const valley = tree.bySlug.get(fixture.valley)!;
    const area = tree.bySlug.get(fixture.area)!;
    expect(town.businessCount).toBeGreaterThanOrEqual(1);
    expect(valley.businessCount).toBe(0);
    expect(tree.totalCount.get(valley.id)).toBeGreaterThanOrEqual(1);
    expect(tree.totalCount.get(area.id)).toBeGreaterThanOrEqual(
      tree.totalCount.get(valley.id)!,
    );
    expect(ancestorsOf(tree, town.id).map((node) => node.slug)).toEqual([
      fixture.area,
      fixture.valley,
    ]);
    expect(descendantsOf(tree, area.id).map((n) => n.slug)).toContain(
      fixture.town,
    );
  });

  it("agrees with the map about how many businesses exist", async () => {
    const tree = await loadPlaceTree();
    const map = await getValleysMap();
    expect(tree).not.toBeNull();
    expect(map.state).toBe("ready");
    if (!tree || map.state !== "ready") return;
    const fromTree = tree.nodes.reduce(
      (sum, node) => sum + node.businessCount,
      0,
    );
    expect(fromTree).toBe(map.totalBusinesses);
  });

  it("groups every locality under a council area exactly once", async () => {
    const tree = await loadPlaceTree();
    if (!tree) throw new Error("tree unavailable");
    const grouped = groupByArea(tree).flatMap((entry) =>
      entry.groups.flatMap((group) => group.places.map((p) => p.slug)),
    );
    expect(new Set(grouped).size).toBe(grouped.length);
    const view = viewPlaceDirectory(tree, { q: "", area: "", active: true });
    expect(view.visiblePlaces).toBeGreaterThanOrEqual(1);
  });

  it("includes businesses in the places inside a wider place", async () => {
    for (const place of [fixture.town, fixture.valley, fixture.area]) {
      const result = await listPublishedBusinesses({ place });
      expect(result.state).toBe("ready");
      if (result.state !== "ready") continue;
      expect(result.businesses.map((b) => b.slug)).toContain(
        fixture.businessSlug,
      );
    }
  });

  it("does not leak into a sibling valley", async () => {
    const result = await listPublishedBusinesses({
      place: fixture.otherValley,
    });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.businesses.map((b) => b.slug)).not.toContain(
      fixture.businessSlug,
    );
    expect(result.total).toBe(0);
  });

  it("treats an unknown place as no results, not every business", async () => {
    const result = await listPublishedBusinesses({ place: "no-such-place" });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.total).toBe(0);
  });

  it("widens offers and events the same way", async () => {
    const offers = await listPublicOffers({ place: fixture.valley, page: 1 });
    const events = await listPublicEvents({ place: fixture.area });
    expect(offers.state).toBe("ready");
    expect(events.state).toBe("ready");
    if (offers.state === "ready") {
      expect(offers.offers.length).toBeGreaterThanOrEqual(1);
    }
    if (events.state === "ready") {
      expect(events.events.length).toBeGreaterThanOrEqual(1);
    }
    const sibling = await listPublicEvents({ place: fixture.otherValley });
    if (sibling.state === "ready") expect(sibling.events).toHaveLength(0);
  });

  it("exposes only public place data", async () => {
    const tree = await loadPlaceTree();
    if (!tree) throw new Error("tree unavailable");
    const keys = new Set(tree.nodes.flatMap((node) => Object.keys(node)));
    expect([...keys].sort()).toEqual(
      [
        "aliases",
        "businessCount",
        "coverageStatus",
        "id",
        "name",
        "parentId",
        "placeType",
        "slug",
        "welshName",
      ].sort(),
    );
  });
});
