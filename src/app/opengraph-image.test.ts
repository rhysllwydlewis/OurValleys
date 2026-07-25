import { describe, expect, it } from "vitest";
import { alt, contentType, size } from "./opengraph-image";

describe("opengraph-image metadata", () => {
  it("declares the expected alt text", () => {
    expect(alt).toBe("OurValleys");
  });

  it("declares a standard social preview size", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
  });

  it("declares a PNG content type", () => {
    expect(contentType).toBe("image/png");
  });
});
