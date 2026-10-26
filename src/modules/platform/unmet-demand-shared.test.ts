import { describe, expect, it } from "vitest";
import { parseUnmetDemandWindow } from "./unmet-demand-shared";

describe("parseUnmetDemandWindow", () => {
  it("accepts the offered windows", () => {
    expect(parseUnmetDemandWindow("7")).toBe(7);
    expect(parseUnmetDemandWindow("30")).toBe(30);
    expect(parseUnmetDemandWindow("90")).toBe(90);
  });

  it("falls back to 30 days for anything else", () => {
    expect(parseUnmetDemandWindow(undefined)).toBe(30);
    expect(parseUnmetDemandWindow("")).toBe(30);
    expect(parseUnmetDemandWindow("365")).toBe(30);
    expect(parseUnmetDemandWindow("7; drop table")).toBe(30);
  });
});
