import { describe, expect, it } from "vitest";
import { parseCsv, planImport } from "./csv-import";

const lookups = {
  categoriesBySlug: new Map([["cafes", "cat-1"]]),
  placesBySlug: new Map([["treorchy", "place-1"]]),
};
const header = "trading_name,welsh_name,category,place,business_type\n";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,"b, ""c"""\r\nd,e\r\n\r\n')).toEqual([
      ["a", 'b, "c"'],
      ["d", "e"],
    ]);
  });
});

describe("planImport", () => {
  it("accepts valid rows and defaults the type to premises", () => {
    const plan = planImport(
      `${header}Y Caffi,Y Caffi,cafes,Treorchy,\n`,
      lookups,
    );
    expect(plan.errors).toEqual([]);
    expect(plan.rows[0]).toMatchObject({
      tradingName: "Y Caffi",
      categoryId: "cat-1",
      placeId: "place-1",
      businessType: "premises",
    });
  });

  it("reports unknown slugs, bad types and duplicates by line", () => {
    const plan = planImport(
      `${header}A Cafe,,nope,treorchy,\nB Cafe,,cafes,nowhere,\nC Cafe,,cafes,treorchy,shop\nD Cafe,,cafes,treorchy,online\nd cafe,,cafes,treorchy,\n`,
      lookups,
    );
    expect(plan.rows.map((row) => row.line)).toEqual([5]);
    expect(plan.errors.map((error) => error.line)).toEqual([2, 3, 4, 6]);
  });

  it("rejects missing columns, empty files and oversized batches", () => {
    expect(planImport("trading_name\nx\n", lookups).errors[0]?.message).toMatch(
      /Missing required columns/,
    );
    expect(planImport(header, lookups).errors).toHaveLength(1);
    const many = Array.from(
      { length: 201 },
      (_, i) => `Cafe ${i},,cafes,treorchy,`,
    );
    expect(planImport(header + many.join("\n"), lookups).rows).toEqual([]);
  });
});
