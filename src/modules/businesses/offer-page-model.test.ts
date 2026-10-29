import { describe, expect, it } from "vitest";
import {
  describeOfferTimeline,
  isEndingSoon,
  offerNeedsEndingNotice,
  safeOfferActionUrl,
} from "./offer-page-model";

const now = new Date("2026-10-29T12:00:00.000Z");
const at = (iso: string) => new Date(iso);

describe("describeOfferTimeline", () => {
  it("has no urgency for an offer without an end", () => {
    expect(describeOfferTimeline(null, now)).toEqual({ kind: "open" });
  });

  it("calls an offer that has finished ended", () => {
    expect(describeOfferTimeline(at("2026-10-29T11:59:00Z"), now)).toEqual({
      kind: "ended",
    });
  });

  it("counts British calendar days: later today, tomorrow, then days", () => {
    expect(
      describeOfferTimeline(at("2026-10-29T22:00:00Z"), now),
    ).toMatchObject({ kind: "today", urgency: "today" });
    expect(
      describeOfferTimeline(at("2026-10-30T10:00:00Z"), now),
    ).toMatchObject({ kind: "tomorrow", urgency: "soon" });
    expect(describeOfferTimeline(at("2026-11-03T10:00:00Z"), now)).toEqual({
      kind: "days",
      days: 5,
      urgency: "soon",
    });
    expect(
      describeOfferTimeline(at("2026-11-20T10:00:00Z"), now),
    ).toMatchObject({ kind: "days", days: 22, urgency: "later" });
  });

  it("treats a 23:30 UTC end in summer as the next British day", () => {
    const summer = at("2026-07-10T12:00:00Z");
    expect(
      describeOfferTimeline(at("2026-07-10T23:30:00Z"), summer),
    ).toMatchObject({ kind: "tomorrow" });
  });
});

describe("isEndingSoon", () => {
  it("is true within a week and false for open, later or ended offers", () => {
    const soon = (iso: string) =>
      isEndingSoon(describeOfferTimeline(at(iso), now));
    expect(soon("2026-10-29T20:00:00Z")).toBe(true);
    expect(soon("2026-11-05T10:00:00Z")).toBe(true);
    expect(soon("2026-11-06T10:00:00Z")).toBe(false);
    expect(isEndingSoon(describeOfferTimeline(null, now))).toBe(false);
    expect(soon("2026-10-01T10:00:00Z")).toBe(false);
  });
});

describe("safeOfferActionUrl", () => {
  it("allows plain web links only", () => {
    expect(safeOfferActionUrl("https://example.test/deal")).toBe(
      "https://example.test/deal",
    );
    expect(safeOfferActionUrl("http://example.test")).toBe(
      "http://example.test/",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "mailto:a@example.test",
    "tel:01443000000",
    "/relative/path",
    "//evil.test/x",
    "not a url",
    "",
    null,
  ])("rejects %s", (value) => {
    expect(safeOfferActionUrl(value)).toBeNull();
  });
});

describe("offerNeedsEndingNotice", () => {
  const ends = at("2026-10-31T10:00:00Z");

  it("is due within two British days of the end", () => {
    expect(offerNeedsEndingNotice(ends, null, now)).toBe(true);
    expect(offerNeedsEndingNotice(at("2026-11-01T10:00:00Z"), null, now)).toBe(
      false,
    );
  });

  it("is not due with no end, after the end, or once flagged for this end", () => {
    expect(offerNeedsEndingNotice(null, null, now)).toBe(false);
    expect(offerNeedsEndingNotice(at("2026-10-29T11:00:00Z"), null, now)).toBe(
      false,
    );
    expect(offerNeedsEndingNotice(ends, ends, now)).toBe(false);
  });

  it("is due again when the end has moved since the last notice", () => {
    expect(offerNeedsEndingNotice(ends, at("2026-10-30T10:00:00Z"), now)).toBe(
      true,
    );
  });
});
