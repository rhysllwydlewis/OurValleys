import { describe, expect, it } from "vitest";
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
} from "./admin-categories";

const validCreateInput = {
  name: "Plumbing & Heating",
  slug: "plumbing-heating",
  description: "Local plumbing and heating businesses.",
};

const validUpdateInput = {
  ...validCreateInput,
  id: "00000000-0000-4000-8000-000000000001",
  status: "active",
  sortOrder: 5,
};

describe("createCategoryInputSchema", () => {
  it("accepts a valid category input and defaults sortOrder to 0", () => {
    const result = createCategoryInputSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
    expect(result.data?.sortOrder).toBe(0);
  });

  it("lowercases and trims the slug", () => {
    const result = createCategoryInputSchema.safeParse({
      ...validCreateInput,
      slug: "  Plumbing-Heating  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.slug).toBe("plumbing-heating");
  });

  it("rejects a slug with disallowed characters", () => {
    expect(
      createCategoryInputSchema.safeParse({
        ...validCreateInput,
        slug: "plumbing_heating!",
      }).success,
    ).toBe(false);
  });

  it("rejects a name or description that is too short", () => {
    expect(
      createCategoryInputSchema.safeParse({ ...validCreateInput, name: "A" })
        .success,
    ).toBe(false);
    expect(
      createCategoryInputSchema.safeParse({
        ...validCreateInput,
        description: "too short",
      }).success,
    ).toBe(false);
  });

  it("rejects a sortOrder outside the declared bounds", () => {
    expect(
      createCategoryInputSchema.safeParse({
        ...validCreateInput,
        sortOrder: -1,
      }).success,
    ).toBe(false);
    expect(
      createCategoryInputSchema.safeParse({
        ...validCreateInput,
        sortOrder: 10000,
      }).success,
    ).toBe(false);
  });
});

describe("updateCategoryInputSchema", () => {
  it("accepts a valid update input", () => {
    expect(updateCategoryInputSchema.safeParse(validUpdateInput).success).toBe(
      true,
    );
  });

  it("rejects an id that is not a UUID", () => {
    expect(
      updateCategoryInputSchema.safeParse({
        ...validUpdateInput,
        id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects a status outside the declared set", () => {
    expect(
      updateCategoryInputSchema.safeParse({
        ...validUpdateInput,
        status: "archived",
      }).success,
    ).toBe(false);
  });

  it("requires sortOrder rather than defaulting it", () => {
    const withoutSortOrder: Record<string, unknown> = {
      ...validUpdateInput,
    };
    delete withoutSortOrder.sortOrder;
    expect(updateCategoryInputSchema.safeParse(withoutSortOrder).success).toBe(
      false,
    );
  });
});
