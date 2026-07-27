import { describe, expect, it } from "vitest";
import {
  createPlaceInputSchema,
  updatePlaceInputSchema,
} from "./admin-places";

const validCreateInput = {
  canonicalName: "Pontypridd",
  welshName: "Pontypridd",
  slug: "pontypridd",
  placeType: "town",
  editorialSummary: "A fictional directory summary for Pontypridd.",
};

const validUpdateInput = {
  ...validCreateInput,
  id: "00000000-0000-4000-8000-000000000001",
  coverageStatus: "active",
  status: "active",
};

describe("createPlaceInputSchema", () => {
  it("accepts a valid place input", () => {
    expect(createPlaceInputSchema.safeParse(validCreateInput).success).toBe(
      true,
    );
  });

  it("lowercases and trims the slug", () => {
    const result = createPlaceInputSchema.safeParse({
      ...validCreateInput,
      slug: "  Upper-Boat  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.slug).toBe("upper-boat");
  });

  it("normalises a blank Welsh name to null", () => {
    const result = createPlaceInputSchema.safeParse({
      ...validCreateInput,
      welshName: "   ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.welshName).toBeNull();
  });

  it("rejects invalid slugs and undersized text fields", () => {
    expect(
      createPlaceInputSchema.safeParse({
        ...validCreateInput,
        slug: "ponty_pridd!",
      }).success,
    ).toBe(false);
    expect(
      createPlaceInputSchema.safeParse({
        ...validCreateInput,
        canonicalName: "A",
      }).success,
    ).toBe(false);
    expect(
      createPlaceInputSchema.safeParse({
        ...validCreateInput,
        editorialSummary: "too short",
      }).success,
    ).toBe(false);
  });
});

describe("updatePlaceInputSchema", () => {
  it("accepts a valid update input", () => {
    expect(updatePlaceInputSchema.safeParse(validUpdateInput).success).toBe(
      true,
    );
  });

  it("rejects an id that is not a UUID", () => {
    expect(
      updatePlaceInputSchema.safeParse({
        ...validUpdateInput,
        id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects coverage and publication statuses outside the declared sets", () => {
    expect(
      updatePlaceInputSchema.safeParse({
        ...validUpdateInput,
        coverageStatus: "archived",
      }).success,
    ).toBe(false);
    expect(
      updatePlaceInputSchema.safeParse({
        ...validUpdateInput,
        status: "draft",
      }).success,
    ).toBe(false);
  });

  it("requires update-only status fields", () => {
    const withoutCoverageStatus: Record<string, unknown> = {
      ...validUpdateInput,
    };
    delete withoutCoverageStatus.coverageStatus;
    expect(
      updatePlaceInputSchema.safeParse(withoutCoverageStatus).success,
    ).toBe(false);

    const withoutStatus: Record<string, unknown> = { ...validUpdateInput };
    delete withoutStatus.status;
    expect(updatePlaceInputSchema.safeParse(withoutStatus).success).toBe(false);
  });
});
