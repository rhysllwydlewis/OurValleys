import { describe, expect, it } from "vitest";
import { publicBusinessRadiusCondition } from "./sql";

describe("publicBusinessRadiusCondition", () => {
  it("builds a parameterised PostGIS condition", () => {
    const condition = publicBusinessRadiusCondition({ longitude: -3.505, latitude: 51.659, radiusMetres: 10_000 });
    expect(condition).toBeDefined();
    expect(condition.queryChunks.length).toBeGreaterThan(0);
  });
});
