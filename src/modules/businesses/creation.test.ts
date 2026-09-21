import { describe, expect, it } from "vitest";
import { businessCreationSchema } from "./creation";

const validInput = {
  tradingName: "Cwm Coil Heating",
  welshName: null,
  primaryCategoryId: "00000000-0000-4000-8000-000000000001",
  placeId: "00000000-0000-4000-8000-000000000002",
  businessType: "premises",
} as const;

describe("businessCreationSchema", () => {
  it("accepts a valid business draft input", () => {
    expect(businessCreationSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts every declared business type", () => {
    for (const businessType of ["premises", "service_area", "online"]) {
      expect(
        businessCreationSchema.safeParse({ ...validInput, businessType })
          .success,
      ).toBe(true);
    }
  });

  it("rejects a trading name that is too short or too long", () => {
    expect(
      businessCreationSchema.safeParse({ ...validInput, tradingName: "A" })
        .success,
    ).toBe(false);
    expect(
      businessCreationSchema.safeParse({
        ...validInput,
        tradingName: "A".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("trims surrounding whitespace from the trading name", () => {
    const result = businessCreationSchema.safeParse({
      ...validInput,
      tradingName: "  Cwm Coil Heating  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.tradingName).toBe("Cwm Coil Heating");
  });

  it("rejects a category or place id that is not a UUID", () => {
    expect(
      businessCreationSchema.safeParse({
        ...validInput,
        primaryCategoryId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      businessCreationSchema.safeParse({ ...validInput, placeId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });

  it("rejects a business type outside the declared set", () => {
    expect(
      businessCreationSchema.safeParse({
        ...validInput,
        businessType: "franchise",
      }).success,
    ).toBe(false);
  });

  it("defaults a missing welshName to null", () => {
    const withoutWelshName: Record<string, unknown> = { ...validInput };
    delete withoutWelshName.welshName;
    const result = businessCreationSchema.safeParse(withoutWelshName);
    expect(result.success).toBe(true);
    expect(result.data?.welshName).toBeNull();
  });

  it("accepts an optional welshName", () => {
    const result = businessCreationSchema.safeParse({
      ...validInput,
      welshName: "Gwresogi Cwm Coil",
    });
    expect(result.success).toBe(true);
    expect(result.data?.welshName).toBe("Gwresogi Cwm Coil");
  });

  it("normalises a blank welshName to null", () => {
    const result = businessCreationSchema.safeParse({
      ...validInput,
      welshName: "   ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.welshName).toBeNull();
  });
});
