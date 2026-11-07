import { describe, expect, it } from "vitest";
import { buildFollowOptions } from "./follow-options";

const counts = { updates: 3, offers: 0, events: null };

describe("buildFollowOptions", () => {
  it("lists the four ways to follow, with absolute addresses", () => {
    const options = buildFollowOptions({
      origin: "https://ourvalleys.example/",
      slug: "cwm-coil-heating",
      counts,
    });
    expect(options.map((o) => o.kind)).toEqual([
      "updates",
      "offers",
      "events",
      "calendar",
    ]);
    expect(options.map((o) => o.address)).toEqual([
      "https://ourvalleys.example/b/cwm-coil-heating/updates/feed.xml",
      "https://ourvalleys.example/b/cwm-coil-heating/offers/feed.xml",
      "https://ourvalleys.example/b/cwm-coil-heating/events/feed.xml",
      "https://ourvalleys.example/b/cwm-coil-heating/events/feed.ics",
    ]);
  });

  it("offers a webcal link for the calendar only, and keeps counts as given", () => {
    const options = buildFollowOptions({
      origin: "http://127.0.0.1:3000",
      slug: "a",
      counts,
    });
    expect(options.filter((o) => o.subscribeHref)).toHaveLength(1);
    expect(options[3]?.subscribeHref).toBe(
      "webcal://127.0.0.1:3000/b/a/events/feed.ics",
    );
    expect(options.map((o) => o.count)).toEqual([3, 0, null, null]);
  });

  it("encodes an unexpected slug so the address cannot be mangled", () => {
    const [first] = buildFollowOptions({
      origin: "https://x.example",
      slug: "a b/../c?d",
      counts,
    });
    expect(first?.address).toBe(
      "https://x.example/b/a%20b%2F..%2Fc%3Fd/updates/feed.xml",
    );
  });
});
