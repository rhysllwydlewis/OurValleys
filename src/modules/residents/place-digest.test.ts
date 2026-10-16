import { describe, expect, it } from "vitest";
import {
  composePlaceDigestEmail,
  isDigestContentEmpty,
  resolveDigestSince,
} from "./place-digest";

const now = new Date("2026-09-28T09:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const siteUrl = new URL("https://example.test/");
const unsubscribeUrl =
  "https://example.test/unsubscribe/saved_place_digest/x/y";

describe("resolveDigestSince", () => {
  it("looks back a week for a recipient who has never had a digest", () => {
    expect(resolveDigestSince(null, now)).toEqual(daysAgo(7));
  });

  it("starts from the last digest when it is recent", () => {
    expect(resolveDigestSince(daysAgo(7), now)).toEqual(daysAgo(7));
  });

  it("never looks back further than the maximum window", () => {
    expect(resolveDigestSince(daysAgo(60), now)).toEqual(daysAgo(14));
  });
});

describe("isDigestContentEmpty", () => {
  it("is empty only when there are no businesses and no events", () => {
    expect(
      isDigestContentEmpty({
        businesses: [],
        events: [],
        savedOffers: [],
        savedEvents: [],
      }),
    ).toBe(true);
    expect(
      isDigestContentEmpty({
        businesses: [{ name: "A", slug: "a", placeName: "P" }],
        events: [],
        savedOffers: [],
        savedEvents: [],
      }),
    ).toBe(false);
    expect(
      isDigestContentEmpty({
        businesses: [],
        events: [],
        savedOffers: [
          { id: "o", title: "T", businessName: "A", businessSlug: "a" },
        ],
        savedEvents: [],
      }),
    ).toBe(false);
  });
});

describe("composePlaceDigestEmail", () => {
  it("lists businesses and events with absolute links and an unsubscribe link", () => {
    const { subject, text } = composePlaceDigestEmail(
      {
        businesses: [
          { name: "Caffi'r Bont", slug: "caffir-bont", placeName: "Treorchy" },
        ],
        events: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            title: "Quiz night",
            businessName: "Caffi'r Bont",
            placeName: "Treorchy",
            startsAt: new Date("2026-10-02T19:00:00.000Z"),
          },
        ],
        savedOffers: [],
        savedEvents: [],
      },
      unsubscribeUrl,
      siteUrl,
    );

    expect(subject).toBe("2 new things from your saved places and businesses");
    expect(text).toContain("https://example.test/b/caffir-bont");
    expect(text).toContain(
      "https://example.test/events/11111111-1111-4111-8111-111111111111",
    );
    expect(text).toContain("Fri 2 Oct");
    expect(text).toContain(unsubscribeUrl);
  });

  it("uses a singular subject for one item and omits empty sections", () => {
    const { subject, text } = composePlaceDigestEmail(
      {
        businesses: [{ name: "A", slug: "a", placeName: "P" }],
        events: [],
        savedOffers: [],
        savedEvents: [],
      },
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe("1 new thing from your saved places and businesses");
    expect(text).not.toContain("New events");
    expect(text).not.toContain("From businesses you saved");
  });

  it("adds a section for offers and events from saved businesses", () => {
    const { subject, text } = composePlaceDigestEmail(
      {
        businesses: [],
        events: [],
        savedOffers: [
          {
            id: "o1",
            title: "Two for one",
            businessName: "Caffi'r Bont",
            businessSlug: "caffir-bont",
          },
        ],
        savedEvents: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            title: "Open mic",
            businessName: "Caffi'r Bont",
            startsAt: new Date("2026-10-02T19:00:00.000Z"),
          },
        ],
      },
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe("2 new things from your saved places and businesses");
    expect(text).toContain("From businesses you saved");
    expect(text).toContain("Offer: Two for one");
    expect(text).toContain("https://example.test/b/caffir-bont");
    expect(text).toContain(
      "https://example.test/events/22222222-2222-4222-8222-222222222222",
    );
  });
});
