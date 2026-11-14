import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY,
  displayAttributes,
  isDefaultDisplay,
  normaliseDisplay,
  parseDisplayCookie,
  serialiseDisplay,
} from "./preferences";

describe("display preferences", () => {
  it("round-trips through the cookie format", () => {
    const prefs = normaliseDisplay(
      (g) =>
        ({ text: "larger", contrast: "high", motion: "reduced" })[g as "text"],
    );
    expect(parseDisplayCookie(serialiseDisplay(prefs))).toEqual(prefs);
  });

  it("falls back to defaults for missing, tampered or oversized values", () => {
    expect(parseDisplayCookie(undefined)).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplayCookie("text:huge.contrast:<script>")).toEqual(
      DEFAULT_DISPLAY,
    );
    expect(parseDisplayCookie("x".repeat(500))).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplayCookie("text:large.bogus:1").text).toBe("large");
  });

  it("emits attributes only for non-default choices", () => {
    expect(displayAttributes(DEFAULT_DISPLAY)).toEqual({});
    expect(
      displayAttributes({
        ...DEFAULT_DISPLAY,
        contrast: "high",
        text: "large",
      }),
    ).toEqual({
      "data-display-text": "large",
      "data-display-contrast": "high",
    });
  });

  it("recognises the default set", () => {
    expect(isDefaultDisplay(DEFAULT_DISPLAY)).toBe(true);
    expect(isDefaultDisplay({ ...DEFAULT_DISPLAY, font: "plain" })).toBe(false);
  });
});
