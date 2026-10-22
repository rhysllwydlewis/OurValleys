import { describe, expect, it } from "vitest";
import type { LifecycleView } from "./lifecycle-automation";
import {
  availableActions,
  isListingAction,
  listingHeadline,
  listingTimeline,
  londonDateInput,
  nameConfirmationMatches,
  parseClosureDate,
} from "./listing-health-model";

const now = new Date("2026-10-22T12:00:00Z");
const day = 86_400_000;

const active: LifecycleView = {
  state: "active",
  autoPublishEnabled: false,
  autoPublishAt: null,
  postponedUntil: null,
  lifecycleEmailsEnabled: true,
  termsAccepted: true,
  lastConfirmedAt: new Date(now.getTime() - 100 * day),
  nextConfirmationDueAt: new Date(now.getTime() + 200 * day),
  temporaryClosedUntil: null,
  deletionRequestedAt: null,
  deleteAfter: null,
};

describe("listingHeadline", () => {
  it("separates a live page from one that is not public yet", () => {
    expect(listingHeadline("active", "published")).toBe("live");
    expect(listingHeadline("active", "draft")).toBe("not_public");
    expect(listingHeadline("active", "pending_review")).toBe("not_public");
  });

  it("lets a non-active lifecycle state win over the publication status", () => {
    expect(listingHeadline("paused", "published")).toBe("paused");
    expect(listingHeadline("deletion_pending", "deletion_pending")).toBe(
      "deletion_pending",
    );
    expect(listingHeadline("temporarily_closed", "published")).toBe(
      "temporarily_closed",
    );
  });
});

describe("listingTimeline", () => {
  it("shows a distant confirmation as calm", () => {
    const [item] = listingTimeline({
      lifecycle: active,
      publicationStatus: "published",
      now,
    });
    expect(item).toMatchObject({ code: "confirmation", urgency: "calm" });
    expect(item?.days).toBe(200);
  });

  it("flags a confirmation within 30 days as soon and a past one as overdue", () => {
    const soon = listingTimeline({
      lifecycle: {
        ...active,
        nextConfirmationDueAt: new Date(now.getTime() + 10 * day),
      },
      publicationStatus: "published",
      now,
    });
    expect(soon[0]?.urgency).toBe("soon");
    const late = listingTimeline({
      lifecycle: {
        ...active,
        nextConfirmationDueAt: new Date(now.getTime() - 3 * day),
      },
      publicationStatus: "published",
      now,
    });
    expect(late[0]).toMatchObject({ urgency: "overdue", days: -3 });
  });

  it("orders items soonest first and includes the closure end", () => {
    const items = listingTimeline({
      lifecycle: {
        ...active,
        state: "temporarily_closed",
        temporaryClosedUntil: new Date(now.getTime() + 5 * day),
      },
      publicationStatus: "published",
      now,
    });
    expect(items.map((item) => item.code)).toEqual([
      "closure_ends",
      "confirmation",
    ]);
  });

  it("shows only the deletion date while deletion is pending", () => {
    const items = listingTimeline({
      lifecycle: {
        ...active,
        state: "deletion_pending",
        deleteAfter: new Date(now.getTime() + 4 * day),
      },
      publicationStatus: "deletion_pending",
      now,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ code: "deletion", urgency: "soon" });
  });

  it("shows nothing for a permanently closed page", () => {
    expect(
      listingTimeline({
        lifecycle: { ...active, state: "permanently_closed" },
        publicationStatus: "published",
        now,
      }),
    ).toEqual([]);
  });

  it("shows automatic publication only for an unpublished draft, using the later postponed date", () => {
    const base = {
      ...active,
      autoPublishEnabled: true,
      autoPublishAt: new Date(now.getTime() + 3 * day),
    };
    expect(
      listingTimeline({
        lifecycle: base,
        publicationStatus: "published",
        now,
      }).map((item) => item.code),
    ).toEqual(["confirmation"]);
    const postponed = listingTimeline({
      lifecycle: {
        ...base,
        postponedUntil: new Date(now.getTime() + 9 * day),
      },
      publicationStatus: "draft",
      now,
    });
    const auto = postponed.find((item) => item.code === "auto_publish");
    expect(auto?.days).toBe(9);
  });

  it("ignores an invalid date", () => {
    expect(
      listingTimeline({
        lifecycle: { ...active, nextConfirmationDueAt: new Date("nope") },
        publicationStatus: "published",
        now,
      }),
    ).toEqual([]);
  });
});

describe("availableActions", () => {
  const owner = { canLifecycle: true, isOwner: true };
  const manager = { canLifecycle: true, isOwner: false };

  it("offers nothing without the lifecycle permission", () => {
    expect(
      availableActions({ state: "active", canLifecycle: false, isOwner: true }),
    ).toEqual([]);
  });

  it("offers the everyday actions to a manager and keeps the severe ones for the owner", () => {
    const forManager = availableActions({ state: "active", ...manager });
    expect(forManager).toEqual(["confirm", "pause", "temporary_close"]);
    expect(
      availableActions({ state: "temporarily_closed", ...manager }),
    ).toEqual(["confirm", "pause", "resume", "temporary_close"]);
    const forOwner = availableActions({ state: "active", ...owner });
    expect(forOwner).toEqual([
      "confirm",
      "pause",
      "temporary_close",
      "permanent_close",
      "request_deletion",
    ]);
  });

  it("offers resume when paused and only recovery when deletion is pending", () => {
    expect(availableActions({ state: "paused", ...manager })).toContain(
      "resume",
    );
    expect(availableActions({ state: "deletion_pending", ...manager })).toEqual(
      [],
    );
    expect(availableActions({ state: "deletion_pending", ...owner })).toEqual([
      "cancel_deletion",
    ]);
  });

  it("lets a permanently closed page be reopened or deleted but not paused", () => {
    expect(availableActions({ state: "permanently_closed", ...owner })).toEqual(
      ["resume", "request_deletion"],
    );
  });
});

describe("parseClosureDate", () => {
  it("reads a day as the end of that UK day", () => {
    const result = parseClosureDate("2026-11-05", now);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.until.toISOString()).toBe("2026-11-05T23:59:00.000Z");
  });

  it("is correct in summer time", () => {
    const result = parseClosureDate(
      "2026-07-20",
      new Date("2026-07-01T09:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.until.toISOString()).toBe("2026-07-20T22:59:00.000Z");
  });

  it("is correct on the day the clocks change", () => {
    const result = parseClosureDate("2026-10-25", now);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.until.toISOString()).toBe("2026-10-25T23:59:00.000Z");
    const spring = parseClosureDate(
      "2026-03-29",
      new Date("2026-03-01T09:00:00Z"),
    );
    expect(spring.ok).toBe(true);
    if (spring.ok)
      expect(spring.until.toISOString()).toBe("2026-03-29T22:59:00.000Z");
  });

  it("refuses blank, malformed, impossible, past and very distant dates", () => {
    expect(parseClosureDate("", now)).toEqual({
      ok: false,
      reason: "required",
    });
    expect(parseClosureDate("5 Nov", now)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseClosureDate("2026-02-30", now)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseClosureDate("2026-10-21", now)).toEqual({
      ok: false,
      reason: "past",
    });
    expect(parseClosureDate("2028-01-01", now)).toEqual({
      ok: false,
      reason: "too_far",
    });
  });

  it("honours a shorter limit for postponing", () => {
    expect(parseClosureDate("2027-02-01", now, 89)).toEqual({
      ok: false,
      reason: "too_far",
    });
    expect(parseClosureDate("2026-12-01", now, 89).ok).toBe(true);
  });

  it("allows closing until the end of today", () => {
    expect(parseClosureDate("2026-10-22", now).ok).toBe(true);
  });
});

describe("londonDateInput", () => {
  it("uses the UK day, not the UTC day", () => {
    expect(londonDateInput(new Date("2026-07-01T23:30:00Z"))).toBe(
      "2026-07-02",
    );
    expect(londonDateInput(new Date("2026-12-01T23:30:00Z"))).toBe(
      "2026-12-01",
    );
  });
});

describe("nameConfirmationMatches", () => {
  it("accepts the name regardless of case and spacing", () => {
    expect(
      nameConfirmationMatches("  cwm   coil HEATING ", "Cwm Coil Heating"),
    ).toBe(true);
  });

  it("refuses a different or empty name", () => {
    expect(nameConfirmationMatches("Cwm Coil", "Cwm Coil Heating")).toBe(false);
    expect(nameConfirmationMatches("", "Cwm Coil Heating")).toBe(false);
    expect(nameConfirmationMatches("", "")).toBe(false);
  });
});

describe("isListingAction", () => {
  it("accepts known actions only", () => {
    expect(isListingAction("pause")).toBe(true);
    expect(isListingAction("constructor")).toBe(false);
    expect(isListingAction(undefined)).toBe(false);
  });
});
