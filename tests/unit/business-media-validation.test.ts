import { describe, expect, it } from "vitest";
import {
  inspectImageUpload,
  maxImageBytes,
  moveIdInOrder,
  normaliseFocalPoint,
} from "@/modules/businesses/media-validation";

function createPng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

describe("business media validation", () => {
  it("inspects the actual PNG signature and dimensions", () => {
    const result = inspectImageUpload(createPng(1600, 900), "image/png");

    expect(result).toEqual({
      status: "valid",
      image: {
        contentType: "image/png",
        extension: "png",
        width: 1600,
        height: 900,
      },
    });
  });

  it("rejects a declared type that does not match the file contents", () => {
    const result = inspectImageUpload(createPng(800, 600), "image/jpeg");
    expect(result.status).toBe("invalid");
  });

  it("rejects empty, oversized, tiny and implausibly large images", () => {
    expect(inspectImageUpload(Buffer.alloc(0), "image/png").status).toBe(
      "invalid",
    );
    expect(
      inspectImageUpload(Buffer.alloc(maxImageBytes + 1), "image/png").status,
    ).toBe("invalid");
    expect(inspectImageUpload(createPng(16, 16), "image/png").status).toBe(
      "invalid",
    );
    expect(inspectImageUpload(createPng(12_001, 100), "image/png").status).toBe(
      "invalid",
    );
  });

  it("accepts only bounded integer focal points", () => {
    expect(normaliseFocalPoint(0)).toBe(0);
    expect(normaliseFocalPoint(50)).toBe(50);
    expect(normaliseFocalPoint(100)).toBe(100);
    expect(normaliseFocalPoint(-1)).toBeNull();
    expect(normaliseFocalPoint(101)).toBeNull();
    expect(normaliseFocalPoint(50.5)).toBeNull();
  });

  it("moves gallery IDs one place without losing or duplicating them", () => {
    const ids = ["a", "b", "c"];
    expect(moveIdInOrder(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveIdInOrder(ids, "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveIdInOrder(ids, "a", "up")).toEqual(ids);
    expect(moveIdInOrder(ids, "missing", "down")).toEqual(ids);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});
