import { describe, expect, it } from "vitest";
import {
  ancestorsOf,
  buildPlaceTree,
  descendantsOf,
  groupByArea,
  parsePlaceDirectoryFilters,
  placeDirectoryHref,
  placeMatchesText,
  viewPlaceDirectory,
  type PlaceNode,
} from "./place-tree";

function node(
  id: string,
  name: string,
  placeType: string,
  parentId: string | null,
  businessCount = 0,
  extra: Partial<PlaceNode> = {},
): PlaceNode {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    welshName: null,
    placeType,
    coverageStatus: "seeding",
    parentId,
    aliases: [],
    businessCount,
    ...extra,
  };
}

const fixture: PlaceNode[] = [
  node("rct", "Rhondda Cynon Taf", "region", null),
  node("fawr", "Rhondda Fawr", "valley", "rct"),
  node("fach", "Rhondda Fach", "valley", "rct"),
  node("tonypandy", "Tonypandy", "town", "fawr", 3, {
    welshName: "Tonypandy",
    aliases: ["Pandy"],
  }),
  node("treorchy", "Treorchy", "town", "fawr", 0, { welshName: "Treorci" }),
  node("ferndale", "Ferndale", "town", "fach", 1),
  node("bridgend-area", "Bridgend County Borough", "region", null),
  node("bridgend", "Bridgend", "town", "bridgend-area", 0),
  node("newbridge", "Newbridge Rise", "neighbourhood", "bridgend", 2),
];
const tree = buildPlaceTree(fixture);

describe("place tree", () => {
  it("rolls business counts up to every ancestor", () => {
    expect(tree.totalCount.get("fawr")).toBe(3);
    expect(tree.totalCount.get("rct")).toBe(4);
    expect(tree.totalCount.get("bridgend")).toBe(2);
    expect(tree.totalCount.get("bridgend-area")).toBe(2);
  });

  it("lists ancestors root first and descendants at any depth", () => {
    expect(ancestorsOf(tree, "tonypandy").map((n) => n.id)).toEqual([
      "rct",
      "fawr",
    ]);
    expect(ancestorsOf(tree, "rct")).toEqual([]);
    expect(descendantsOf(tree, "bridgend-area").map((n) => n.id)).toEqual([
      "bridgend",
      "newbridge",
    ]);
  });

  it("survives a missing parent and a cycle without looping", () => {
    const odd = buildPlaceTree([
      node("a", "A", "town", "gone", 1),
      node("b", "B", "town", "c", 1),
      node("c", "C", "town", "b", 1),
      node("d", "D", "town", "d", 1),
    ]);
    expect(odd.totalCount.get("a")).toBe(1);
    expect(odd.totalCount.get("b")).toBe(2);
    expect(ancestorsOf(odd, "b").length).toBeLessThanOrEqual(2);
    expect(descendantsOf(odd, "d")).toEqual([]);
  });

  it("groups localities by council area and valley, busiest valley first", () => {
    const areas = groupByArea(tree);
    const rct = areas.find((entry) => entry.area.id === "rct")!;
    expect(rct.groups.map((g) => g.heading?.name)).toEqual([
      "Rhondda Fawr",
      "Rhondda Fach",
    ]);
    expect(rct.placeCount).toBe(3);
    const bridgend = areas.find((entry) => entry.area.id === "bridgend-area")!;
    expect(bridgend.groups).toHaveLength(1);
    expect(bridgend.groups[0]!.heading).toBeNull();
    expect(bridgend.groups[0]!.places.map((p) => p.name)).toEqual([
      "Bridgend",
      "Newbridge Rise",
    ]);
  });
});

describe("place search", () => {
  it("matches names, Welsh names and aliases ignoring case and accents", () => {
    expect(placeMatchesText(fixture[3]!, "PANDY")).toBe(true);
    expect(placeMatchesText(fixture[4]!, "treorci")).toBe(true);
    expect(placeMatchesText(fixture[4]!, "ferndale")).toBe(false);
    expect(placeMatchesText(fixture[4]!, "  ")).toBe(true);
  });

  it("treats typed text literally", () => {
    expect(placeMatchesText(fixture[3]!, "%")).toBe(false);
    expect(placeMatchesText(fixture[3]!, ".*")).toBe(false);
  });
});

describe("directory view", () => {
  it("flattens a text search into matching localities only", () => {
    const view = viewPlaceDirectory(tree, { q: "r", area: "", active: false });
    expect(view.matches?.map((n) => n.name)).toEqual([
      "Bridgend",
      "Ferndale",
      "Newbridge Rise",
      "Treorchy",
    ]);
    expect(view.areas).toEqual([]);
  });

  it("hides places without businesses when only active places are wanted", () => {
    const view = viewPlaceDirectory(tree, { q: "", area: "", active: true });
    const names = view.areas.flatMap((entry) =>
      entry.groups.flatMap((g) => g.places.map((p) => p.name)),
    );
    expect(names).toEqual(
      expect.arrayContaining(["Tonypandy", "Ferndale", "Newbridge Rise"]),
    );
    expect(names).not.toContain("Treorchy");
    expect(view.visiblePlaces).toBe(names.length);
  });

  it("scopes to one council area and ignores unknown or non-area slugs", () => {
    const scoped = viewPlaceDirectory(tree, {
      q: "",
      area: "bridgend-county-borough",
      active: false,
    });
    expect(scoped.areas.map((entry) => entry.area.id)).toEqual([
      "bridgend-area",
    ]);
    const valley = viewPlaceDirectory(tree, {
      q: "",
      area: "rhondda-fawr",
      active: false,
    });
    expect(valley.areas).toHaveLength(2);
    const unknown = viewPlaceDirectory(tree, {
      q: "",
      area: "nowhere",
      active: false,
    });
    expect(unknown.areas).toHaveLength(2);
  });

  it("reports an empty result when nothing matches", () => {
    const view = viewPlaceDirectory(tree, {
      q: "zzzz",
      area: "",
      active: false,
    });
    expect(view.matches).toEqual([]);
    expect(view.totalPlaces).toBe(5);
  });
});

describe("url state", () => {
  it("round-trips filters and omits defaults", () => {
    expect(placeDirectoryHref({})).toBe("/places");
    const filters = parsePlaceDirectoryFilters({
      q: " Pandy ",
      area: "rhondda-cynon-taf",
      active: "1",
    });
    expect(filters).toEqual({
      q: "Pandy",
      area: "rhondda-cynon-taf",
      active: true,
    });
    expect(placeDirectoryHref(filters)).toBe(
      "/places?q=Pandy&area=rhondda-cynon-taf&active=1",
    );
  });

  it("rejects malformed area slugs and truncates long searches", () => {
    const filters = parsePlaceDirectoryFilters({
      q: "x".repeat(200),
      area: "../etc/passwd",
      active: ["1", "0"],
    });
    expect(filters.area).toBe("");
    expect(filters.q).toHaveLength(60);
    expect(filters.active).toBe(true);
  });
});
