import { describe, expect, it } from "vitest";
import { createQrMatrix, renderQrSvg } from "@/modules/businesses/qr-code";

describe("business QR code", () => {
  it("creates a deterministic version-five matrix with finder patterns", () => {
    const value = "https://ourvalleys.co.uk/b/cwm-coil-heating?source=qr";
    const first = createQrMatrix(value);
    const second = createQrMatrix(value);

    expect(first).toEqual(second);
    expect(first).toHaveLength(37);
    expect(first.every((row) => row.length === 37)).toBe(true);
    expect(first[0]?.slice(0, 7)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(first[3]?.slice(0, 7)).toEqual([
      true,
      false,
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(first[0]?.slice(30, 37)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(first[30]?.slice(0, 7)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("renders an accessible dependency-free SVG with a quiet zone", () => {
    const svg = renderQrSvg(
      "https://ourvalleys.co.uk/b/example",
      'Example & "Co"',
    );
    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 45 45"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain("Example &amp; &quot;Co&quot;");
    expect(svg).not.toContain("<script");
  });

  it("rejects destinations that exceed the bounded QR capacity", () => {
    expect(() =>
      createQrMatrix(`https://example.test/${"x".repeat(200)}`),
    ).toThrow(/too long/i);
  });
});
