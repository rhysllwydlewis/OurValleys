const QR_VERSION = 5;
const QR_SIZE = QR_VERSION * 4 + 17;
const DATA_CODEWORDS = 108;
const ERROR_CORRECTION_CODEWORDS = 26;
const QUIET_ZONE = 4;

export type QrMatrix = readonly (readonly boolean[])[];

function appendBits(target: number[], value: number, length: number): void {
  for (let bit = length - 1; bit >= 0; bit -= 1) {
    target.push(((value >>> bit) & 1) !== 0 ? 1 : 0);
  }
}

function createDataCodewords(value: string): number[] {
  const bytes = [...new TextEncoder().encode(value)];
  if (bytes.length > 106) {
    throw new Error(
      "The QR destination is too long for the stable free-site code.",
    );
  }

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode.
  appendBits(bits, bytes.length, 8); // Versions 1–9 use an 8-bit byte count.
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      byte = (byte << 1) | (bits[offset + bit] ?? 0);
    }
    codewords.push(byte);
  }

  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(pads[padIndex % pads.length] ?? 0xec);
    padIndex += 1;
  }
  return codewords;
}

function gfMultiply(left: number, right: number): number {
  let x = left;
  let y = right;
  let product = 0;
  while (y > 0) {
    if ((y & 1) !== 0) product ^= x;
    y >>>= 1;
    x <<= 1;
    if ((x & 0x100) !== 0) x ^= 0x11d;
  }
  return product;
}

function createGeneratorPolynomial(degree: number): number[] {
  let polynomial = [1];
  let root = 1;
  for (let index = 0; index < degree; index += 1) {
    const next = Array<number>(polynomial.length + 1).fill(0);
    for (
      let coefficient = 0;
      coefficient < polynomial.length;
      coefficient += 1
    ) {
      const value = polynomial[coefficient] ?? 0;
      next[coefficient] ^= value;
      next[coefficient + 1] ^= gfMultiply(value, root);
    }
    polynomial = next;
    root = gfMultiply(root, 2);
  }
  return polynomial;
}

function createErrorCorrection(
  data: readonly number[],
  degree: number,
): number[] {
  const divisor = createGeneratorPolynomial(degree);
  const remainder = Array<number>(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ (remainder[0] ?? 0);
    remainder.shift();
    remainder.push(0);
    for (let index = 0; index < degree; index += 1) {
      remainder[index] =
        (remainder[index] ?? 0) ^ gfMultiply(divisor[index + 1] ?? 0, factor);
    }
  }
  return remainder;
}

function formatBits(mask: number): number {
  const errorCorrectionLevelL = 0b01;
  const data = (errorCorrectionLevelL << 3) | mask;
  let remainder = data;
  for (let index = 0; index < 10; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

export function createQrMatrix(value: string): QrMatrix {
  const data = createDataCodewords(value);
  const codewords = [
    ...data,
    ...createErrorCorrection(data, ERROR_CORRECTION_CODEWORDS),
  ];
  const dataBits: number[] = [];
  for (const codeword of codewords) appendBits(dataBits, codeword, 8);

  const matrix: Array<Array<boolean | null>> = Array.from(
    { length: QR_SIZE },
    () => Array<boolean | null>(QR_SIZE).fill(null),
  );

  const set = (row: number, column: number, dark: boolean) => {
    if (row >= 0 && row < QR_SIZE && column >= 0 && column < QR_SIZE) {
      matrix[row]![column] = dark;
    }
  };

  const placeFinder = (top: number, left: number) => {
    for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 7; columnOffset += 1) {
        const distance = Math.max(
          Math.abs(rowOffset - 3),
          Math.abs(columnOffset - 3),
        );
        set(
          top + rowOffset,
          left + columnOffset,
          distance !== 2 && distance !== 4,
        );
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, QR_SIZE - 7);
  placeFinder(QR_SIZE - 7, 0);

  for (let offset = 8; offset < QR_SIZE - 8; offset += 1) {
    set(6, offset, offset % 2 === 0);
    set(offset, 6, offset % 2 === 0);
  }

  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
      const distance = Math.max(Math.abs(rowOffset), Math.abs(columnOffset));
      set(30 + rowOffset, 30 + columnOffset, distance !== 1);
    }
  }

  // Reserve both copies of the format information before placing payload bits.
  for (let offset = 0; offset <= 8; offset += 1) {
    if (offset !== 6) {
      set(8, offset, false);
      set(offset, 8, false);
    }
  }
  for (let offset = 0; offset < 8; offset += 1) {
    set(8, QR_SIZE - 1 - offset, false);
    set(QR_SIZE - 1 - offset, 8, false);
  }
  set(QR_SIZE - 8, 8, true);

  let bitIndex = 0;
  let upward = true;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let step = 0; step < QR_SIZE; step += 1) {
      const row = upward ? QR_SIZE - 1 - step : step;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const column = right - columnOffset;
        if (matrix[row]![column] !== null) continue;
        const raw = (dataBits[bitIndex] ?? 0) !== 0;
        const masked = (row + column) % 2 === 0 ? !raw : raw;
        matrix[row]![column] = masked;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  const format = formatBits(0);
  const formatBit = (index: number) => ((format >>> index) & 1) !== 0;
  for (let index = 0; index <= 5; index += 1) set(index, 8, formatBit(index));
  set(7, 8, formatBit(6));
  set(8, 8, formatBit(7));
  set(8, 7, formatBit(8));
  for (let index = 9; index < 15; index += 1) {
    set(8, 14 - index, formatBit(index));
  }
  for (let index = 0; index < 8; index += 1) {
    set(8, QR_SIZE - 1 - index, formatBit(index));
  }
  for (let index = 8; index < 15; index += 1) {
    set(QR_SIZE - 15 + index, 8, formatBit(index));
  }
  set(QR_SIZE - 8, 8, true);

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

export function renderQrSvg(
  value: string,
  title = "Business website QR code",
): string {
  const matrix = createQrMatrix(value);
  const size = matrix.length + QUIET_ZONE * 2;
  const path: string[] = [];

  matrix.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (dark) {
        path.push(
          `M${columnIndex + QUIET_ZONE} ${rowIndex + QUIET_ZONE}h1v1h-1z`,
        );
      }
    });
  });

  const escapedTitle = title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-labelledby="qr-title"><title id="qr-title">${escapedTitle}</title><rect width="100%" height="100%" fill="#fff"/><path d="${path.join("")}" fill="#111"/></svg>`;
}
