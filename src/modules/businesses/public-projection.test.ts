import { describe, expect, it } from "vitest";
import { toPublicBusinessProjection } from "./public-projection";

describe("toPublicBusinessProjection", () => {
  it("returns an allowlisted public shape without private profile fields", () => {
    const projection = toPublicBusinessProjection({
      id: "business-a",
      slug: "example-business",
      tradingName: "Example Business",
      summary: "A safe public summary.",
      description: null,
      locationType: "hidden_address",
      publicEmail: null,
      publicPhone: null,
      publicWebsite: null,
      publicAddress: null,
      serviceRadiusKm: "12.50",
      languages: ["English"],
      accessibility: ["Step-free entrance"],
      publishedAt: new Date("2026-07-19T10:00:00Z"),
      updatedAt: new Date("2026-07-19T11:00:00Z"),
      categorySlug: "builders",
      categoryName: "Builders & General Trades",
      placeSlug: "treorchy",
      placeName: "Treorchy",
    });
    expect(projection.serviceRadiusKm).toBe(12.5);
    expect(projection).not.toHaveProperty("legalName");
    expect(projection).not.toHaveProperty("privateAddress");
    expect(projection).not.toHaveProperty("internalNotes");
    expect(projection).not.toHaveProperty("accountEmail");
  });

  it("does not invent a place when either public place field is absent", () => {
    const projection = toPublicBusinessProjection({
      id: "business-a",
      slug: "online-business",
      tradingName: "Online Business",
      summary: "Online only.",
      description: null,
      locationType: "online_only",
      publicEmail: null,
      publicPhone: null,
      publicWebsite: null,
      publicAddress: null,
      serviceRadiusKm: null,
      languages: [],
      accessibility: [],
      publishedAt: null,
      updatedAt: new Date(),
      categorySlug: "marketing-technology",
      categoryName: "Marketing & Technology",
      placeSlug: null,
      placeName: null,
    });
    expect(projection.place).toBeNull();
  });
});
