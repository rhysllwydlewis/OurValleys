import { describe, expect, it } from "vitest";
import {
  buildContentGroup,
  hasAnyContent,
  isContentKind,
  kindCanBeSaved,
  contentViewEventTypes,
  rankContent,
  type ContentPerformanceInput,
} from "./content-insights-model";

const item = (
  over: Partial<ContentPerformanceInput> & { itemId: string },
): ContentPerformanceInput => ({
  kind: "offer",
  title: over.itemId,
  views: 0,
  saves: 0,
  ...over,
});

describe("rankContent", () => {
  it("orders by views, then saves, then title, deterministically", () => {
    const ranked = rankContent([
      item({ itemId: "b", title: "Bee", views: 3, saves: 1 }),
      item({ itemId: "a", title: "Ant", views: 3, saves: 1 }),
      item({ itemId: "c", title: "Cat", views: 3, saves: 5 }),
      item({ itemId: "d", title: "Dog", views: 9 }),
    ]);
    expect(ranked.map((row) => row.itemId)).toEqual(["d", "c", "a", "b"]);
  });

  it("does not mutate its input", () => {
    const input = [item({ itemId: "a" }), item({ itemId: "b", views: 2 })];
    rankContent(input);
    expect(input[0]?.itemId).toBe("a");
  });
});

describe("buildContentGroup", () => {
  it("scales bars to the busiest item and keeps a visible sliver for small ones", () => {
    const group = buildContentGroup("offer", [
      item({ itemId: "a", views: 200 }),
      item({ itemId: "b", views: 1 }),
      item({ itemId: "c", views: 0 }),
    ]);
    expect(group.rows.map((row) => row.barPercent)).toEqual([100, 2, 2]);
    expect(group.totalViews).toBe(201);
  });

  it("shows empty bars when nothing was viewed", () => {
    const group = buildContentGroup("offer", [item({ itemId: "a" })]);
    expect(group.rows[0]?.barPercent).toBe(0);
  });

  it("only includes its own kind and reports items beyond the limit", () => {
    const items = [
      ...Array.from({ length: 5 }, (_, i) =>
        item({ itemId: `o${i}`, views: i }),
      ),
      item({ itemId: "e1", kind: "event", views: 50 }),
    ];
    const group = buildContentGroup("offer", items, 3);
    expect(group.rows).toHaveLength(3);
    expect(group.hiddenCount).toBe(2);
    expect(group.totalViews).toBe(10);
    expect(group.rows.every((row) => row.kind === "offer")).toBe(true);
  });

  it("clamps negative or fractional counts", () => {
    const group = buildContentGroup("event", [
      item({ itemId: "a", kind: "event", views: -4, saves: 2.9 }),
    ]);
    expect(group.rows[0]).toMatchObject({ views: 0, saves: 2 });
  });
});

describe("hasAnyContent / isContentKind", () => {
  it("is false when no group lists rows", () => {
    expect(
      hasAnyContent([
        buildContentGroup("offer", []),
        buildContentGroup("event", []),
      ]),
    ).toBe(false);
  });
  it("accepts only the four kinds", () => {
    for (const kind of ["offer", "event", "update", "catalogue"]) {
      expect(isContentKind(kind)).toBe(true);
    }
    expect(isContentKind("banner")).toBe(false);
    expect(isContentKind(undefined)).toBe(false);
  });
});

describe("kinds", () => {
  it("lets residents save only offers and events, and gives each kind its own activity type", () => {
    expect(kindCanBeSaved("offer")).toBe(true);
    expect(kindCanBeSaved("event")).toBe(true);
    expect(kindCanBeSaved("update")).toBe(false);
    expect(kindCanBeSaved("catalogue")).toBe(false);
    expect(new Set(Object.values(contentViewEventTypes)).size).toBe(4);
  });
});
