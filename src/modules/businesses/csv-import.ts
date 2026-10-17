import { z } from "zod";
import { foldBusinessName } from "./start-journey";

/**
 * Pure parsing and validation for the admin CSV import of founding
 * businesses. Rows become unclaimed draft records for review; nothing here
 * touches the database, so it is fully testable.
 */

export const maxImportRows = 200;
export const maxImportBytes = 200_000;

export const importColumns = [
  "trading_name",
  "welsh_name",
  "category",
  "place",
  "business_type",
] as const;

/** Splits CSV text into rows of cells (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

const rowSchema = z.object({
  tradingName: z.string().trim().min(2).max(120),
  welshName: z.string().trim().max(120).nullable(),
  categorySlug: z.string().trim().min(1),
  placeSlug: z.string().trim().min(1),
  businessType: z.enum(["premises", "service_area", "online"]),
});

export type ImportRow = {
  line: number;
  tradingName: string;
  welshName: string | null;
  categoryId: string;
  placeId: string;
  placeSlug: string;
  businessType: "premises" | "service_area" | "online";
};

export type ImportRowError = { line: number; message: string };

export type ImportPlan = {
  rows: ImportRow[];
  errors: ImportRowError[];
};

export type ImportLookups = {
  categoriesBySlug: ReadonlyMap<string, string>;
  placesBySlug: ReadonlyMap<string, string>;
};

/** Validates CSV text against the active categories and places. */
export function planImport(text: string, lookups: ImportLookups): ImportPlan {
  const errors: ImportRowError[] = [];
  const rows: ImportRow[] = [];

  if (text.length > maxImportBytes) {
    return {
      rows,
      errors: [{ line: 1, message: "The file is too large to import." }],
    };
  }

  const parsed = parseCsv(text);
  const header = parsed[0]?.map((value) => value.trim().toLowerCase()) ?? [];
  const missing = importColumns.filter(
    (column) =>
      !header.includes(column) &&
      (column === "trading_name" ||
        column === "category" ||
        column === "place"),
  );
  if (missing.length > 0) {
    return {
      rows,
      errors: [
        {
          line: 1,
          message: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
        },
      ],
    };
  }

  const dataRows = parsed.slice(1);
  if (dataRows.length === 0) {
    return {
      rows,
      errors: [{ line: 1, message: "The file has no business rows." }],
    };
  }
  if (dataRows.length > maxImportRows) {
    return {
      rows,
      errors: [
        {
          line: 1,
          message: `Import at most ${maxImportRows} businesses at a time.`,
        },
      ],
    };
  }

  const cellOf = (cells: string[], column: string): string => {
    const at = header.indexOf(column);
    return at === -1 ? "" : (cells[at] ?? "").trim();
  };
  const seen = new Set<string>();

  dataRows.forEach((cells, offset) => {
    const line = offset + 2;
    const parsedRow = rowSchema.safeParse({
      tradingName: cellOf(cells, "trading_name"),
      welshName: cellOf(cells, "welsh_name") || null,
      categorySlug: cellOf(cells, "category").toLowerCase(),
      placeSlug: cellOf(cells, "place").toLowerCase(),
      businessType: cellOf(cells, "business_type").toLowerCase() || "premises",
    });
    if (!parsedRow.success) {
      const field = String(parsedRow.error.issues[0]?.path[0] ?? "row");
      errors.push({ line, message: `Check the ${field} value.` });
      return;
    }
    const value = parsedRow.data;
    const categoryId = lookups.categoriesBySlug.get(value.categorySlug);
    if (!categoryId) {
      errors.push({
        line,
        message: `Unknown category "${value.categorySlug}".`,
      });
      return;
    }
    const placeId = lookups.placesBySlug.get(value.placeSlug);
    if (!placeId) {
      errors.push({ line, message: `Unknown place "${value.placeSlug}".` });
      return;
    }
    const key = `${foldBusinessName(value.tradingName)}|${value.placeSlug}`;
    if (seen.has(key)) {
      errors.push({
        line,
        message: `"${value.tradingName}" appears more than once for this place.`,
      });
      return;
    }
    seen.add(key);
    rows.push({
      line,
      tradingName: value.tradingName,
      welshName: value.welshName,
      categoryId,
      placeId,
      placeSlug: value.placeSlug,
      businessType: value.businessType,
    });
  });

  return { rows, errors };
}
