import { describe, expect, it } from "vitest";
import {
  createFeatureFlagInputSchema,
  updateFeatureFlagInputSchema,
} from "./feature-flags";

const validCreateInput = {
  key: "site-wide-search",
  name: "Site-wide search",
  description: "Combined search across businesses, places and events.",
};

const validUpdateInput = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Site-wide search",
  description: "Combined search across businesses, places and events.",
  enabled: true,
  environments: ["development"],
};

describe("createFeatureFlagInputSchema", () => {
  it("accepts a valid input and defaults enabled to false with no environments", () => {
    const result = createFeatureFlagInputSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
    expect(result.data?.enabled).toBe(false);
    expect(result.data?.environments).toEqual([]);
  });

  it("lowercases and trims the key", () => {
    const result = createFeatureFlagInputSchema.safeParse({
      ...validCreateInput,
      key: "  Site-Wide-Search  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.key).toBe("site-wide-search");
  });

  it("rejects a key with disallowed characters", () => {
    expect(
      createFeatureFlagInputSchema.safeParse({
        ...validCreateInput,
        key: "site_wide_search!",
      }).success,
    ).toBe(false);
  });

  it("rejects a name or description that is too short", () => {
    expect(
      createFeatureFlagInputSchema.safeParse({
        ...validCreateInput,
        name: "A",
      }).success,
    ).toBe(false);
    expect(
      createFeatureFlagInputSchema.safeParse({
        ...validCreateInput,
        description: "too short",
      }).success,
    ).toBe(false);
  });

  it("rejects an environment outside the declared set", () => {
    expect(
      createFeatureFlagInputSchema.safeParse({
        ...validCreateInput,
        environments: ["staging"],
      }).success,
    ).toBe(false);
  });

  it("accepts explicit environments", () => {
    const result = createFeatureFlagInputSchema.safeParse({
      ...validCreateInput,
      environments: ["development", "production"],
    });
    expect(result.success).toBe(true);
    expect(result.data?.environments).toEqual(["development", "production"]);
  });
});

describe("updateFeatureFlagInputSchema", () => {
  it("accepts a valid update input", () => {
    expect(
      updateFeatureFlagInputSchema.safeParse(validUpdateInput).success,
    ).toBe(true);
  });

  it("rejects an id that is not a UUID", () => {
    expect(
      updateFeatureFlagInputSchema.safeParse({
        ...validUpdateInput,
        id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("requires enabled rather than defaulting it", () => {
    const withoutEnabled: Record<string, unknown> = { ...validUpdateInput };
    delete withoutEnabled.enabled;
    expect(updateFeatureFlagInputSchema.safeParse(withoutEnabled).success).toBe(
      false,
    );
  });
});
