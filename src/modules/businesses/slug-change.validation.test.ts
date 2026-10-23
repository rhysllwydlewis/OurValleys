import { describe, expect, it } from "vitest";
import { validateSlugChangeFields } from "./tickets";

describe("validateSlugChangeFields", () => {
  it("accepts a usable name and a reason of ten characters", () => {
    expect(
      validateSlugChangeFields({
        proposedName: "Valley Bakery",
        reason: "We rebranded.",
      }),
    ).toEqual({});
  });

  it("points a name with no usable letters at the name input", () => {
    expect(
      Object.keys(
        validateSlugChangeFields({
          proposedName: "!!",
          reason: "We rebranded.",
        }),
      ),
    ).toEqual(["proposedName"]);
  });

  it("points a short reason, ignoring surrounding spaces, at the reason input", () => {
    expect(
      Object.keys(
        validateSlugChangeFields({
          proposedName: "Valley Bakery",
          reason: "   short   ",
        }),
      ),
    ).toEqual(["reason"]);
  });

  it("reports both fields when both are wrong", () => {
    expect(
      Object.keys(validateSlugChangeFields({ proposedName: "", reason: "" })),
    ).toEqual(["proposedName", "reason"]);
  });
});
