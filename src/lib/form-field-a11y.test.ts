import { describe, expect, it } from "vitest";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";

describe("form field accessibility props", () => {
  it("builds a stable per-form error id", () => {
    expect(fieldErrorId("special-day", "date")).toBe("special-day-error-date");
  });

  it("marks the control invalid and described only when there is a message", () => {
    expect(fieldA11yProps("e-1", "Enter a date")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "e-1",
    });
    expect(fieldA11yProps("e-1", undefined)).toEqual({});
    expect(fieldA11yProps("e-1", "")).toEqual({});
    expect(fieldA11yProps("e-1", null)).toEqual({});
  });
});
