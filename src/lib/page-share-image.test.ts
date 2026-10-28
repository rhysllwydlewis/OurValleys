import { describe, expect, it } from "vitest";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "./page-share-image";

describe("renderPageShareImage", () => {
  it("renders a PNG social preview at the standard size", async () => {
    const response = renderPageShareImage({
      eyebrow: "Rhondda Cynon Taf",
      title: "Pontypridd",
      summary: "x".repeat(400),
    });
    expect(response.headers.get("content-type")).toBe(
      pageShareImageContentType,
    );
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]);
    expect(pageShareImageSize).toEqual({ width: 1200, height: 630 });
  });

  it("renders without a summary", async () => {
    const response = renderPageShareImage({ eyebrow: "A", title: "B" });
    expect(response.status).toBe(200);
  });
});
