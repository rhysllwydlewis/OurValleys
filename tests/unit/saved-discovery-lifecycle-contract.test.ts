import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/modules/residents/saved-discovery.ts"),
  "utf8",
);

describe("saved discovery lifecycle contract", () => {
  it("hides businesses that are no longer durably published", () => {
    expect(source).toContain('eq(business.status, "published")');
    expect(source).toContain('eq(businessPublication.status, "published")');
    expect(source).toContain("isNotNull(businessPublication.publishedAt)");
    expect(source).toContain('eq(businessSite.status, "published")');
    expect(source).toContain("isNotNull(businessSite.publishedAt)");
    expect(source).toContain('eq(businessLocation.status, "active")');
  });

  it("hides cancelled or expired events while retaining current events", () => {
    expect(source).toContain('eq(businessEvent.status, "active")');
    expect(source).toContain("gte(businessEvent.startsAt, now)");
    expect(source).toContain("gte(businessEvent.endsAt, now)");
  });
});
