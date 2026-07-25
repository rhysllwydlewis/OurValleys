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

  it("provides a resolvable icon", () => {
    const result = manifest();

    expect(result.icons).toHaveLength(1);
    expect(result.icons?.[0]).toMatchObject({
      src: "/icon.svg",
      type: "image/svg+xml",
    });
  });
});
