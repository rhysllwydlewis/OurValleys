import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), ...parts), "utf8");

describe("site icon", () => {
  const icon = read("src", "app", "icon.svg");
  const header = read("src", "components", "site-header.tsx");

  it("draws the valley mark from the site header, not lettering", () => {
    // The two strokes of ValleyMark: the hills and the ground line.
    for (const path of ["M3 17 8.5 7.5l4 6 3-5 5.5 8.5", "M5.5 19.5h13"]) {
      expect(header).toContain(path);
      expect(icon).toContain(path);
    }
    expect(icon).not.toContain("<text");
  });

  it("ships a favicon.ico for browsers that ignore SVG icons", () => {
    const ico = readFileSync(join(process.cwd(), "src", "app", "favicon.ico"));
    // ICO header: reserved 0, type 1 (icon), then the number of images.
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(2);
  });
});
