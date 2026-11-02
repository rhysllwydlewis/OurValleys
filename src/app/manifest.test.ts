import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("describes the installable app shell", () => {
    const result = manifest();

    expect(result.name).toBe("OurValleys");
    expect(result.short_name).toBe("OurValleys");
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
  });

  it("lists the vector mark plus 192 and 512 PNG icons, one maskable", () => {
    const icons = manifest().icons ?? [];

    expect(icons[0]).toMatchObject({
      src: "/icon.svg",
      type: "image/svg+xml",
    });
    expect(icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(icons.filter((icon) => icon.purpose === "maskable")).toHaveLength(1);
  });

  it("points every PNG icon at a committed file of the declared size", () => {
    const png = (manifest().icons ?? []).filter(
      (icon) => icon.type === "image/png",
    );

    expect(png).toHaveLength(3);
    for (const icon of png) {
      const file = readFileSync(join(process.cwd(), "public", icon.src));
      const [width, height] = String(icon.sizes).split("x").map(Number);
      // PNG IHDR holds width and height as big-endian ints at bytes 16 and 20.
      expect(file.readUInt32BE(16)).toBe(width);
      expect(file.readUInt32BE(20)).toBe(height);
    }
  });
});
