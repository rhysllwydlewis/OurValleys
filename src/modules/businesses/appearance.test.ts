import { describe, expect, it } from "vitest";
import { businessAccents, getAccent, getSectionDefinition } from "./appearance";

describe("getAccent", () => {
  it("resolves every declared accent by key", () => {
    for (const accent of businessAccents) {
      expect(getAccent(accent.key)).toEqual(accent);
    }
  });

  it("falls back to the first accent for an unknown key", () => {
    expect(getAccent("not-a-real-accent")).toEqual(businessAccents[0]);
    expect(getAccent("")).toEqual(businessAccents[0]);
  });
});

describe("getSectionDefinition", () => {
  it("resolves every declared section by id", () => {
    for (const id of [
      "about",
      "services",
      "gallery",
      "location",
      "hours",
    ] as const) {
      expect(getSectionDefinition(id).id).toBe(id);
    }
  });
});
