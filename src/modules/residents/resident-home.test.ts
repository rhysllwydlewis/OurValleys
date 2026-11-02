import { describe, expect, it } from "vitest";
import {
  describeOfferEnding,
  groupComingUp,
  mergeComingUp,
  parseSavedTab,
  residentNextSteps,
  savedHomeTotal,
  savedTabCount,
  savedTabHref,
  type ComingUpEvent,
} from "./resident-home";

const now = new Date("2026-09-28T09:00:00.000Z");
const at = (iso: string) => new Date(iso);

function event(
  id: string,
  startsAt: string,
  source: ComingUpEvent["source"] = "saved",
  endsAt: string | null = null,
): ComingUpEvent {
  return {
    id,
    title: `Event ${id}`,
    startsAt: at(startsAt),
    endsAt: endsAt ? at(endsAt) : null,
    locationDisplay: null,
    businessName: "Fictional Business",
    businessSlug: "fictional-business",
    source,
  };
}

describe("mergeComingUp", () => {
  it("keeps each event once under its strongest reason, soonest first", () => {
    const merged = mergeComingUp([
      [event("a", "2026-10-02T10:00:00Z", "place")],
      [event("b", "2026-09-30T10:00:00Z", "business")],
      [event("a", "2026-10-02T10:00:00Z", "saved")],
      [event("a", "2026-10-02T10:00:00Z", "business")],
    ]);
    expect(merged.map((item) => [item.id, item.source])).toEqual([
      ["b", "business"],
      ["a", "saved"],
    ]);
  });
});

describe("groupComingUp", () => {
  it("groups today, the next week and later, dropping empty groups", () => {
    const groups = groupComingUp(
      [
        event("today", "2026-09-28T18:00:00Z"),
        event("week", "2026-10-03T18:00:00Z"),
        event("later", "2026-10-20T18:00:00Z"),
      ],
      now,
    );
    expect(groups.map((group) => group.key)).toEqual([
      "today",
      "thisWeek",
      "later",
    ]);
    expect(
      groupComingUp([event("later", "2026-10-20T18:00:00Z")], now),
    ).toEqual([
      { key: "later", events: [expect.objectContaining({ id: "later" })] },
    ]);
  });

  it("counts an event already under way as today", () => {
    const [group] = groupComingUp(
      [event("now", "2026-09-28T08:00:00Z", "saved", "2026-09-28T12:00:00Z")],
      now,
    );
    expect(group?.key).toBe("today");
  });

  it("uses London days, so a late-evening BST event is still that day", () => {
    // 23:30 BST on the 28th is 22:30 UTC the same day.
    const [group] = groupComingUp([event("late", "2026-09-28T22:30:00Z")], now);
    expect(group?.key).toBe("today");
    // 00:30 BST on the 29th is 23:30 UTC on the 28th, but it is tomorrow.
    const [next] = groupComingUp([event("early", "2026-09-28T23:30:00Z")], now);
    expect(next?.key).toBe("thisWeek");
  });

  it("returns nothing for no events", () => {
    expect(groupComingUp([], now)).toEqual([]);
  });
});

describe("describeOfferEnding", () => {
  it("says nothing for open-ended or already-ended offers", () => {
    expect(describeOfferEnding(null, now)).toEqual({ kind: "none" });
    expect(describeOfferEnding(at("2026-09-27T00:00:00Z"), now)).toEqual({
      kind: "none",
    });
  });

  it("says today, then the number of days, within a week", () => {
    expect(describeOfferEnding(at("2026-09-28T20:00:00Z"), now)).toEqual({
      kind: "today",
    });
    expect(describeOfferEnding(at("2026-09-29T20:00:00Z"), now)).toEqual({
      kind: "days",
      days: 1,
    });
    expect(describeOfferEnding(at("2026-10-05T10:00:00Z"), now)).toEqual({
      kind: "days",
      days: 7,
    });
  });

  it("says nothing for offers further than a week away", () => {
    expect(describeOfferEnding(at("2026-10-06T10:00:00Z"), now)).toEqual({
      kind: "none",
    });
  });
});

describe("saved tabs", () => {
  it("falls back to all for anything unknown", () => {
    expect(parseSavedTab(undefined)).toBe("all");
    expect(parseSavedTab("nonsense")).toBe("all");
    expect(parseSavedTab(["events", "places"])).toBe("events");
    expect(parseSavedTab("places")).toBe("places");
  });

  it("builds stable links and counts", () => {
    expect(savedTabHref("all")).toBe("/account/saved");
    expect(savedTabHref("events")).toBe("/account/saved?tab=events");
    const counts = { businesses: 2, events: 3, places: 1 };
    expect(savedTabCount(counts, "all")).toBe(6);
    expect(savedTabCount(counts, "events")).toBe(3);
  });

  it("counts and links saved offers", () => {
    expect(parseSavedTab("offers")).toBe("offers");
    expect(savedTabHref("offers")).toBe("/account/saved?tab=offers");
    const counts = { businesses: 2, events: 3, places: 1, offers: 4 };
    expect(savedTabCount(counts, "offers")).toBe(4);
    expect(savedTabCount(counts, "all")).toBe(10);
    // Counts written before offers could be saved still add up.
    expect(
      savedTabCount({ businesses: 1, events: 1, places: 1 }, "offers"),
    ).toBe(0);
  });
});

describe("residentNextSteps", () => {
  const empty = { businesses: 0, events: 0, places: 0 };

  it("starts with saving something when nothing is saved", () => {
    const steps = residentNextSteps({
      counts: empty,
      digestOn: false,
      remindersOn: false,
      ownsBusiness: false,
      isDemo: false,
    });
    expect(steps.map((step) => step.key)).toEqual([
      "saveFirst",
      "createBusiness",
    ]);
  });

  it("suggests the digest and reminders only when they would have something to say", () => {
    const steps = residentNextSteps({
      counts: { businesses: 1, events: 1, places: 0 },
      digestOn: false,
      remindersOn: false,
      ownsBusiness: true,
      isDemo: false,
    });
    expect(steps.map((step) => step.key)).toEqual([
      "savePlace",
      "turnOnDigest",
      "turnOnReminders",
    ]);
  });

  it("never repeats what is already done and caps at three", () => {
    expect(
      residentNextSteps({
        counts: { businesses: 1, events: 1, places: 1 },
        digestOn: true,
        remindersOn: true,
        ownsBusiness: true,
        isDemo: false,
      }),
    ).toEqual([]);
    expect(
      residentNextSteps({
        counts: { businesses: 1, events: 1, places: 0 },
        digestOn: false,
        remindersOn: false,
        ownsBusiness: false,
        isDemo: false,
      }),
    ).toHaveLength(3);
  });

  it("offers a demo account no account actions", () => {
    const steps = residentNextSteps({
      counts: { businesses: 1, events: 1, places: 1 },
      digestOn: false,
      remindersOn: false,
      ownsBusiness: false,
      isDemo: true,
    });
    expect(steps).toEqual([]);
  });
});

describe("savedHomeTotal", () => {
  it("counts saved searches so a resident with only searches is not shown the empty home", () => {
    expect(
      savedHomeTotal({ businesses: 0, events: 0, places: 0, searches: 2 }),
    ).toBe(2);
  });

  it("adds searches to the other saved items and treats a missing count as zero", () => {
    expect(
      savedHomeTotal({ businesses: 1, events: 2, places: 3, searches: 4 }),
    ).toBe(10);
    expect(savedHomeTotal({ businesses: 1, events: 0, places: 0 })).toBe(1);
  });
});
