import { describe, expect, it } from "vitest";
import { getHomepageDiscovery } from "./public";

describe("homepage discovery composition", () => {
  it("returns bounded public collections", async () => {
    const result = await getHomepageDiscovery();

    expect(result.events.length).toBeLessThanOrEqual(3);
    expect(result.guides.length).toBeLessThanOrEqual(3);
    expect(result.places.length).toBeLessThanOrEqual(6);
  });
});
