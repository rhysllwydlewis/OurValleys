export const allowedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageType = keyof typeof allowedImageTypes;

export const maxImageBytes = 5 * 1024 * 1024;
export const maxImagePixels = 40_000_000;
export const maxImageDimension = 12_000;
export const minImageDimension = 32;

export type InspectedImage = {
  contentType: AllowedImageType;
  extension: (typeof allowedImageTypes)[AllowedImageType];
  width: number;
  height: number;
};

export type ImageInspectionResult =
  | { status: "valid"; image: InspectedImage }
  | { status: "invalid"; message: string };

function inspectPng(bytes: Buffer): { width: number; height: number } | null {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, signature.length).equals(signature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const jpegSizeMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);

function inspectJpeg(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 11 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1]!;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    if (offset + 4 > bytes.length) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;

    if (jpegSizeMarkers.has(marker)) {
      if (length < 7) return null;
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function inspectWebp(bytes: Buffer): { width: number; height: number } | null {
  if (
    bytes.length < 30 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }

  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  if (
    chunk === "VP8 " &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

export function inspectImageUpload(
  bytes: Buffer,
  declaredContentType: string,
): ImageInspectionResult {
  if (bytes.byteLength === 0) {
    return { status: "invalid", message: "The uploaded file was empty." };
  }
  if (bytes.byteLength > maxImageBytes) {
    return { status: "invalid", message: "Images must be 5MB or smaller." };
  }
  if (!(declaredContentType in allowedImageTypes)) {
    return {
      status: "invalid",
      message: "Upload a JPEG, PNG or WebP image.",
    };
  }

  const contentType = declaredContentType as AllowedImageType;
  const dimensions =
    contentType === "image/png"
      ? inspectPng(bytes)
      : contentType === "image/jpeg"
        ? inspectJpeg(bytes)
        : inspectWebp(bytes);

  if (!dimensions) {
    return {
      status: "invalid",
      message: "The file contents do not match the selected image type.",
    };
  }

  if (
    dimensions.width < minImageDimension ||
    dimensions.height < minImageDimension
  ) {
    return {
      status: "invalid",
      message: "Images must be at least 32 pixels wide and high.",
    };
  }

  if (
    dimensions.width > maxImageDimension ||
    dimensions.height > maxImageDimension ||
    dimensions.width * dimensions.height > maxImagePixels
  ) {
    return {
      status: "invalid",
      message: "The image dimensions are too large to process safely.",
    };
  }

  return {
    status: "valid",
    image: {
      contentType,
      extension: allowedImageTypes[contentType],
      width: dimensions.width,
      height: dimensions.height,
    },
  };
}

export function normaliseFocalPoint(value: number): number | null {
  if (!Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

export function moveIdInOrder(
  ids: string[],
  mediaId: string,
  direction: "up" | "down",
): string[] {
  const currentIndex = ids.indexOf(mediaId);
  if (currentIndex < 0) return [...ids];
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= ids.length) return [...ids];

  const reordered = [...ids];
  [reordered[currentIndex], reordered[nextIndex]] = [
    reordered[nextIndex]!,
    reordered[currentIndex]!,
  ];
  return reordered;
}
