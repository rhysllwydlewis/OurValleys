import { describe, expect, it } from "vitest";
import {
  businessAttributeDefinitions,
  businessAttributesInputSchema,
  listDeclaredAttributes,
  type BusinessAttributeValues,
} from "@/modules/businesses/attributes";

function allFalse(): BusinessAttributeValues {
  const values = {} as BusinessAttributeValues;
  for (const definition of businessAttributeDefinitions) {
    values[definition.key] = false;
  }
  return values;
}

describe("business attribute definitions", () => {
  it("gives every attribute a unique key and a non-empty public label", () => {
    const keys = businessAttributeDefinitions.map(
      (definition) => definition.key,
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const definition of businessAttributeDefinitions) {
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });
});

describe("businessAttributesInputSchema", () => {
  it("defaults every attribute to false when given an empty object", () => {
    const result = businessAttributesInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual(allFalse());
  });

  it("accepts a partial patch of true values alongside the defaults", () => {
    const result = businessAttributesInputSchema.safeParse({
      stepFreeAccess: true,
      welshSpeaking: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      ...allFalse(),
      stepFreeAccess: true,
      welshSpeaking: true,
    });
  });

  it("rejects a non-boolean value for a known attribute", () => {
    const result = businessAttributesInputSchema.safeParse({
      stepFreeAccess: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a completely unrelated payload shape", () => {
    expect(businessAttributesInputSchema.safeParse(null).success).toBe(false);
    expect(businessAttributesInputSchema.safeParse("true").success).toBe(false);
  });
});

describe("listDeclaredAttributes", () => {
  it("returns nothing for a business that has never saved this step", () => {
    expect(listDeclaredAttributes(null)).toEqual([]);
  });

  it("returns nothing when every attribute is false", () => {
    expect(listDeclaredAttributes(allFalse())).toEqual([]);
  });

  it("returns only the true attributes, in the defined display order", () => {
    const values: BusinessAttributeValues = {
      ...allFalse(),
      hearingLoop: true,
      stepFreeAccess: true,
    };
    expect(
      listDeclaredAttributes(values).map((definition) => definition.key),
    ).toEqual(["stepFreeAccess", "hearingLoop"]);
  });
});
