import { describe, expect, it } from "vitest";
import { buildAtomFeed, escapeXml } from "@/lib/atom";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";
import type { PublicStory } from "@/modules/stories/public";
import {
  buildBusinessEventsAtom,
  buildBusinessOffersAtom,
  buildBusinessesAtom,
  buildBusinessUpdatesAtom,
  buildEventsAtom,
  buildStoriesAtom,
  buildUpdatesAtom,
} from "./feeds";

const now = new Date("2026-10-09T12:00:00Z");

describe("escapeXml", () => {
  it("escapes markup and strips control characters", () => {
    expect(escapeXml(`<a href="x">&'\u0001</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;",
    );
  });
});

describe("syndication feeds", () => {
  const event = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Fish & chips <night>",
    description: "Bring friends",
    locationDisplay: "Treorchy",
    startsAt: new Date("2026-10-20T18:00:00Z"),
    endsAt: null,
    bookingUrl: null,
    businessName: "Chippy",
    businessSlug: "chippy",
    fictional: true,
  } as PublicEvent;

  it("escapes event text and labels demo content", () => {
    const xml = buildAtomFeed(buildEventsAtom([event], now));
    expect(xml).toContain("[Demo] Fish &amp; chips &lt;night&gt;");
    expect(xml).not.toContain("<night>");
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  it("never emits private business fields", () => {
    const business = {
      id: "b1",
      slug: "cwm-coil",
      tradingName: "Cwm Coil",
      welshName: null,
      summary: "Heating",
      category: { name: "Trades", slug: "trades" },
      place: { name: "Treorchy", slug: "treorchy" },
      verificationStatus: "verified",
      isDemo: false,
      updatedAt: now,
      publishedAt: now,
      rating: { average: null, count: 0 },
      distanceKm: null,
      publicEmail: "secret@example.invalid",
    } as unknown as PublicBusinessSummary;
    const xml = buildAtomFeed(buildBusinessesAtom([business]));
    expect(xml).toContain("/b/cwm-coil");
    expect(xml).not.toContain("secret@example.invalid");
  });

  it("accepts timestamps that arrive as strings from raw SQL", () => {
    const business = {
      id: "b2",
      slug: "stringy",
      tradingName: "Stringy",
      summary: "x",
      category: { name: "Trades", slug: "trades" },
      place: { name: "Treorchy", slug: "treorchy" },
      isDemo: false,
      updatedAt: "2026-10-01T10:00:00.000Z",
      publishedAt: null,
    } as unknown as PublicBusinessSummary;
    const xml = buildAtomFeed(buildBusinessesAtom([business]));
    expect(xml).toContain("<updated>2026-10-01T10:00:00.000Z</updated>");
  });

  it("emits a valid empty feed", () => {
    const xml = buildAtomFeed(buildBusinessesAtom([]));
    expect(xml).not.toContain("<entry>");
  });
});

describe("stories feed", () => {
  const story = {
    slug: "library-reopens",
    title: "Library <reopens> & more",
    summary: "Doors open on Monday.",
    body: "Private body text that must not be in the feed.",
    authorName: "Team",
    sponsorshipDisclosure: null,
    place: { slug: "treorchy", name: "Treorchy" },
    publishedAt: new Date("2026-10-01T09:00:00Z"),
    updatedAt: new Date("2026-10-02T09:00:00Z"),
    readingMinutes: 1,
    contentLocale: "en",
  } as PublicStory;

  it("escapes text, links the story and omits the body", () => {
    const xml = buildAtomFeed(buildStoriesAtom([story], now));
    expect(xml).toContain("Library &lt;reopens&gt; &amp; more");
    expect(xml).toContain("/news/library-reopens");
    expect(xml).toContain("<published>2026-10-01T09:00:00.000Z</published>");
    expect(xml).not.toContain("Private body");
    expect(xml).toContain("/news/feed.xml");
  });

  it("labels sponsored stories in the summary", () => {
    const xml = buildAtomFeed(
      buildStoriesAtom(
        [{ ...story, sponsorshipDisclosure: "Paid for by a shop." }],
        now,
      ),
    );
    expect(xml).toContain(
      "<summary>Sponsored. Doors open on Monday.</summary>",
    );
  });

  it("is valid with no stories", () => {
    const xml = buildAtomFeed(buildStoriesAtom([], now));
    expect(xml).toContain("<feed");
    expect(xml).not.toContain("<entry>");
  });
});

describe("update feeds", () => {
  const update = {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Closed <Monday> & Tuesday",
    body: "We are   closed\nfor the\u0001 bank holiday.",
    publishedAt: new Date("2026-10-08T09:00:00Z"),
    updatedAt: new Date("2026-10-09T08:00:00Z"),
    welsh: false,
    image: null,
    businessName: "Chippy",
    businessSlug: "chippy",
    placeName: "Treorchy",
    categoryName: "Food",
    fictional: true,
  };

  it("links each entry to the update's own page and labels demo content", () => {
    const xml = buildAtomFeed(buildUpdatesAtom([update], now));
    expect(xml).toContain(`/b/chippy/updates/${update.id}`);
    // Stable identity (survives a slug change) and last-edit time, not publish time.
    expect(xml).toContain(`<id>urn:uuid:${update.id}</id>`);
    expect(xml).toContain("<updated>2026-10-09T08:00:00.000Z</updated>");
    expect(xml).toContain("<published>2026-10-08T09:00:00.000Z</published>");
    expect(xml).toContain(
      "[Demo] Closed &lt;Monday&gt; &amp; Tuesday – Chippy",
    );
    expect(xml).not.toContain("<Monday>");
    expect(xml).not.toContain("\u0001");
    expect(xml).toContain("/updates/feed.xml");
  });

  it("builds a per-business feed pointing at that business", () => {
    const feed = buildBusinessUpdatesAtom(
      { name: "Chippy", slug: "chippy", fictional: false },
      [update],
      now,
    );
    expect(feed.selfUrl).toMatch(/\/b\/chippy\/updates\/feed\.xml$/);
    expect(feed.title).toBe("Updates from Chippy");
    expect(feed.entries[0]?.title).toBe("Closed <Monday> & Tuesday – Chippy");
  });

  it("never dates an entry in the future", () => {
    const future = {
      ...update,
      publishedAt: new Date("2027-01-01T00:00:00Z"),
      updatedAt: new Date("2027-01-01T00:00:00Z"),
    };
    const feed = buildUpdatesAtom([future], now);
    expect(feed.entries[0]?.updated.getTime()).toBe(now.getTime());
    expect(feed.updated.getTime()).toBe(new Date(0).getTime());
  });
});

describe("per-business offers and events feeds", () => {
  const business = { name: "Cwm & Coil", slug: "cwm-coil", fictional: true };
  const offer = {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Free <check>",
    description: "A boiler check.",
    terms: "One per home",
    businessName: "Cwm & Coil",
    businessSlug: "cwm-coil",
    fictional: true,
  } as unknown as import("@/modules/businesses/public-offers").PublicOffer;
  const event = {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Question night",
    description: "Ask anything",
    locationDisplay: "Online",
    startsAt: new Date("2026-10-20T18:00:00Z"),
    endsAt: null,
    bookingUrl: null,
    businessName: "Cwm & Coil",
    businessSlug: "cwm-coil",
    fictional: true,
  } as PublicEvent;

  it("points offers at their own page with a stable id and escaped text", () => {
    const xml = buildAtomFeed(buildBusinessOffersAtom(business, [offer], now));
    expect(xml).toContain("[Demo] Free &lt;check&gt; – Cwm &amp; Coil");
    expect(xml).toContain(`urn:uuid:${offer.id}`);
    expect(xml).toContain(`/offers/${offer.id}`);
    expect(xml).toContain("/b/cwm-coil/offers/feed.xml");
    expect(xml).toContain("Terms: One per home");
    expect(xml).not.toContain("<check>");
  });

  it("points events at their own page and survives an empty list", () => {
    const xml = buildAtomFeed(buildBusinessEventsAtom(business, [event], now));
    expect(xml).toContain(`/events/${event.id}`);
    expect(xml).toContain("Events from Cwm &amp; Coil");
    const empty = buildAtomFeed(buildBusinessEventsAtom(business, [], now));
    expect(empty).toContain("<feed");
    expect(empty).not.toContain("<entry>");
  });

  it("does not demo-label a real business", () => {
    const xml = buildAtomFeed(
      buildBusinessOffersAtom({ ...business, fictional: false }, [offer], now),
    );
    expect(xml).not.toContain("[Demo]");
  });
});
