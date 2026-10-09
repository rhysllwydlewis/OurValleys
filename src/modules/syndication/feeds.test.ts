import { describe, expect, it } from "vitest";
import { buildAtomFeed, escapeXml } from "@/lib/atom";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";
import { buildBusinessesAtom, buildEventsAtom } from "./feeds";

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

  it("emits a valid empty feed", () => {
    const xml = buildAtomFeed(buildBusinessesAtom([]));
    expect(xml).not.toContain("<entry>");
  });
});
