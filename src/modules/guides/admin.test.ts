import { describe, expect, it } from "vitest";
import { createGuideInputSchema, updateGuideInputSchema } from "./admin";

const validSection = {
  heading: "Start with a local search",
  body: "Use the business directory to explore published café profiles.",
  href: "/businesses?q=coffee",
  linkLabel: "Search coffee businesses",
};

const validCreateInput = {
  title: "Independent coffee across the Valleys",
  slug: "independent-coffee-across-the-valleys",
  summary:
    "How to combine local cafés, high streets and nearby events into an afternoon out.",
  areaLabel: "Across Rhondda Cynon Taf",
  readingTime: "4 minute read",
  authorName: "OurValleys editorial team",
  sections: [validSection],
};

describe("createGuideInputSchema", () => {
  it("accepts a valid guide and normalises optional fields to null", () => {
    const result = createGuideInputSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
    expect(result.data?.sponsorshipDisclosure).toBeNull();
    expect(result.data?.reviewDueAt).toBeNull();
  });

  it("lowercases the slug", () => {
    const result = createGuideInputSchema.safeParse({
      ...validCreateInput,
      slug: "Independent-Coffee",
    });
    expect(result.success).toBe(true);
    expect(result.data?.slug).toBe("independent-coffee");
  });

  it("rejects a slug with disallowed characters", () => {
    expect(
      createGuideInputSchema.safeParse({
        ...validCreateInput,
        slug: "independent_coffee!",
      }).success,
    ).toBe(false);
  });

  it("rejects a title or summary that is too short", () => {
    expect(
      createGuideInputSchema.safeParse({ ...validCreateInput, title: "Hi" })
        .success,
    ).toBe(false);
    expect(
      createGuideInputSchema.safeParse({
        ...validCreateInput,
        summary: "Too short",
      }).success,
    ).toBe(false);
  });

  it("rejects a guide with no sections", () => {
    expect(
      createGuideInputSchema.safeParse({ ...validCreateInput, sections: [] })
        .success,
    ).toBe(false);
  });

  it("parses a supplied review due date", () => {
    const result = createGuideInputSchema.safeParse({
      ...validCreateInput,
      reviewDueAt: "2027-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    expect(result.data?.reviewDueAt).toEqual(
      new Date("2027-01-01T00:00:00.000Z"),
    );
  });

  it("keeps a supplied sponsorship disclosure", () => {
    const result = createGuideInputSchema.safeParse({
      ...validCreateInput,
      sponsorshipDisclosure: "This guide includes a paid feature.",
    });
    expect(result.success).toBe(true);
    expect(result.data?.sponsorshipDisclosure).toBe(
      "This guide includes a paid feature.",
    );
  });
});

describe("updateGuideInputSchema", () => {
  const validUpdateInput = {
    ...validCreateInput,
    id: "00000000-0000-4000-8000-000000000001",
  };

  it("accepts a valid update input", () => {
    expect(updateGuideInputSchema.safeParse(validUpdateInput).success).toBe(
      true,
    );
  });

  it("rejects an id that is not a UUID", () => {
    expect(
      updateGuideInputSchema.safeParse({
        ...validUpdateInput,
        id: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});
