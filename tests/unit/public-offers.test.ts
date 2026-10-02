import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { daysUntilOfferEnds } from "@/modules/businesses/public-offers";

describe("daysUntilOfferEnds", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("returns null for open-ended offers", () => {
    expect(daysUntilOfferEnds(null, now)).toBeNull();
  });

  it("rounds partial days up so a same-day offer is not shown as expired", () => {
    expect(daysUntilOfferEnds(new Date("2026-10-02T18:00:00Z"), now)).toBe(1);
  });

  it("counts whole days", () => {
    expect(daysUntilOfferEnds(new Date("2026-10-09T12:00:00Z"), now)).toBe(7);
  });

  it("never goes negative", () => {
    expect(daysUntilOfferEnds(new Date("2026-10-01T12:00:00Z"), now)).toBe(0);
  });
});
