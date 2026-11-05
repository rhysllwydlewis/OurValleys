import { describe, expect, it } from "vitest";
import {
  inspectImageUpload,
  normaliseZoom,
  zoomLimits,
} from "./media-validation";

function buildJpeg(width: number, height: number): Buffer {
  const bytes = Buffer.from([
    0xff,
    0xd8, // SOI
    0xff,
    0xc0, // SOF0 marker
    0x00,
    0x0b, // segment length (11)
    0x08, // precision
    0x00,
    0x00, // height placeholder
    0x00,
    0x00, // width placeholder
    0x01, // number of components
    0x11,
    0x00,
    0x00, // component data
  ]);
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}

function buildWebp(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

describe("inspectImageUpload", () => {
  it("reads dimensions from a JPEG SOF0 segment", () => {
    const result = inspectImageUpload(buildJpeg(200, 100), "image/jpeg");

    expect(result).toEqual({
      status: "valid",
      image: {
        contentType: "image/jpeg",
        extension: "jpg",
        width: 200,
        height: 100,
      },
    });
  });

  it("rejects a JPEG that never reaches a size marker", () => {
    const result = inspectImageUpload(
      Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      "image/jpeg",
    );

    expect(result).toEqual({
      status: "invalid",
      message: "The file contents do not match the selected image type.",
    });
  });

  it("reads dimensions from a WebP VP8X chunk", () => {
    const result = inspectImageUpload(buildWebp(300, 150), "image/webp");

    expect(result).toEqual({
      status: "valid",
      image: {
        contentType: "image/webp",
        extension: "webp",
        width: 300,
        height: 150,
      },
    });
  });

  it("rejects a WebP file missing the RIFF/WEBP signature", () => {
    const result = inspectImageUpload(Buffer.alloc(30), "image/webp");

    expect(result).toEqual({
      status: "invalid",
      message: "The file contents do not match the selected image type.",
    });
  });
});

describe("normaliseZoom", () => {
  it("accepts whole percentages from 100 to 300", () => {
    expect(zoomLimits).toMatchObject({ min: 100, max: 300 });
    expect(normaliseZoom(100)).toBe(100);
    expect(normaliseZoom(250)).toBe(250);
    expect(normaliseZoom(300)).toBe(300);
  });

  it("refuses anything else instead of guessing", () => {
    for (const bad of [99, 301, 150.5, Number.NaN, Infinity, -100, 0]) {
      expect(normaliseZoom(bad)).toBeNull();
    }
  });
});
