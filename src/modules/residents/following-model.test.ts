import { describe, expect, it } from "vitest";
import {
  composeFollowNotices,
  FOLLOW_MAX_NOTICES_PER_RUN,
  followDedupeKey,
  followHref,
  resolveFollowWindow,
  type FollowCandidate,
} from "./following-model";

const now = new Date("2026-10-27T12:00:00.000Z");
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000);

function candidate(overrides: Partial<FollowCandidate> = {}): FollowCandidate {
  return {
    userId: "u1",
    kind: "update",
    itemId: "i1",
    businessName: "Cwm Bakery",
    businessSlug: "cwm-bakery",
    title: "Closed Monday",
    createdAt: minutesAgo(5),
    ...overrides,
  };
}

describe("resolveFollowWindow", () => {
  it("looks back an hour on the first run", () => {
    expect(resolveFollowWindow(null, now)).toEqual({
      since: minutesAgo(60),
      until: now,
    });
  });

  it("continues from the cursor", () => {
    expect(resolveFollowWindow(minutesAgo(30), now).since).toEqual(
      minutesAgo(30),
    );
  });

  it("never looks back further than a day after an outage", () => {
    expect(resolveFollowWindow(minutesAgo(60 * 24 * 5), now).since).toEqual(
      minutesAgo(60 * 24),
    );
  });

  it("clamps a cursor in the future so the window is never inverted", () => {
    const window = resolveFollowWindow(new Date(now.getTime() + 60_000), now);
    expect(window.since.getTime()).toBeLessThanOrEqual(window.until.getTime());
  });
});

describe("followHref", () => {
  it("opens the section or page that holds each kind", () => {
    expect(followHref(candidate())).toBe("/b/cwm-bakery/updates?update=i1");
    expect(followHref(candidate({ kind: "offer" }))).toBe(
      "/b/cwm-bakery#offers",
    );
    expect(followHref(candidate({ kind: "event" }))).toBe("/events/i1");
  });

  it("encodes anything unusual so the link stays on the site", () => {
    const href = followHref(
      candidate({ businessSlug: "a/../b?x=1", itemId: "../x" }),
    );
    expect(href.startsWith("/b/a%2F..%2Fb%3Fx%3D1/")).toBe(true);
    expect(href).not.toContain("//");
  });
});

describe("composeFollowNotices", () => {
  it("builds a notice with a stable dedupe key per item", () => {
    const [draft] = composeFollowNotices([
      candidate({ kind: "event", startsAt: minutesAgo(-1000) }),
    ]);
    expect(draft).toMatchObject({
      userId: "u1",
      kind: "followed_event",
      dedupeKey: followDedupeKey("event", "i1"),
      params: { business: "Cwm Bakery", title: "Closed Monday" },
    });
    expect(typeof draft?.params.startsAt).toBe("string");
  });

  it("caps notices per person and keeps the newest", () => {
    const many = Array.from(
      { length: FOLLOW_MAX_NOTICES_PER_RUN + 5 },
      (_, index) =>
        candidate({ itemId: `i${index}`, createdAt: minutesAgo(index + 1) }),
    );
    const drafts = composeFollowNotices([
      ...many,
      candidate({ userId: "u2", itemId: "other" }),
    ]);
    expect(drafts.filter((d) => d.userId === "u1")).toHaveLength(
      FOLLOW_MAX_NOTICES_PER_RUN,
    );
    expect(drafts.filter((d) => d.userId === "u2")).toHaveLength(1);
    expect(drafts.some((d) => d.dedupeKey === "follow:update:i0")).toBe(true);
    expect(
      drafts.some(
        (d) =>
          d.dedupeKey === `follow:update:i${FOLLOW_MAX_NOTICES_PER_RUN + 4}`,
      ),
    ).toBe(false);
  });

  it("returns nothing for nothing", () => {
    expect(composeFollowNotices([])).toEqual([]);
  });
});
