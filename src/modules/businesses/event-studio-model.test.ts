import { describe, expect, it } from "vitest";
import {
  actionsFor,
  copyDates,
  countEvents,
  duplicateTitle,
  eventGuidance,
  eventLimits,
  eventReadiness,
  eventState,
  groupEvents,
  isPostponeDays,
  isQuickAction,
  parseEventForm,
  readEventValues,
  shiftLondonDays,
  toLondonInput,
  upcomingSeriesCounts,
  type EventFormValues,
  type StudioEvent,
} from "./event-studio-model";

const now = new Date("2026-06-10T10:00:00Z");
const hour = 3_600_000;
const day = 24 * hour;

function event(overrides: Partial<StudioEvent> = {}): StudioEvent {
  return {
    id: "e1",
    title: "Quiz night",
    description: "A friendly quiz in the village hall with a raffle.",
    locationDisplay: "Village hall",
    bookingUrl: "https://example.test/book",
    startsAt: new Date(now.getTime() + 3 * day),
    endsAt: new Date(now.getTime() + 3 * day + 2 * hour),
    status: "active",
    seriesId: null,
    hasImage: true,
    ...overrides,
  };
}

function values(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    title: "Quiz night",
    description: "A friendly quiz in the village hall.",
    locationDisplay: "",
    bookingUrl: "",
    startsAt: "2026-06-20T19:00",
    endsAt: "",
    status: "active",
    repeatFrequency: "",
    repeatOccurrences: "",
    applyToSeries: "",
    ...overrides,
  };
}

describe("eventState", () => {
  it("mirrors the public listing rule", () => {
    expect(eventState(event(), now)).toBe("upcoming");
    expect(
      eventState(
        event({
          startsAt: new Date(now.getTime() - hour),
          endsAt: new Date(now.getTime() + hour),
        }),
        now,
      ),
    ).toBe("happening");
    expect(
      eventState(
        event({
          startsAt: new Date(now.getTime() - day),
          endsAt: new Date(now.getTime() - day + hour),
        }),
        now,
      ),
    ).toBe("past");
  });

  it("treats an event with no end as over once it has started", () => {
    expect(
      eventState(
        event({ startsAt: new Date(now.getTime() - hour), endsAt: null }),
        now,
      ),
    ).toBe("past");
    expect(eventState(event({ endsAt: null }), now)).toBe("upcoming");
  });

  it("lets the owner's status win over the dates", () => {
    expect(eventState(event({ status: "draft" }), now)).toBe("draft");
    expect(eventState(event({ status: "hidden" }), now)).toBe("hidden");
    expect(eventState(event({ status: "cancelled" }), now)).toBe("cancelled");
    expect(
      eventState(
        event({ status: "draft", startsAt: new Date(now.getTime() - day) }),
        now,
      ),
    ).toBe("draft");
  });
});

describe("readiness and guidance", () => {
  it("needs a title, description and a date that is not over", () => {
    expect(eventReadiness(event(), now)).toEqual({ ready: true, missing: [] });
    const blank = eventReadiness(
      event({
        title: " ",
        description: "x",
        startsAt: new Date(now.getTime() - day),
        endsAt: null,
      }),
      now,
    );
    expect(blank.missing).toEqual(["title", "description", "future"]);
  });

  it("says nothing about a finished or cancelled event", () => {
    expect(
      eventGuidance(event({ status: "cancelled", hasImage: false }), now),
    ).toEqual([]);
    expect(
      eventGuidance(
        event({
          startsAt: new Date(now.getTime() - day),
          endsAt: new Date(now.getTime() - day + hour),
        }),
        now,
      ),
    ).toEqual([]);
  });

  it("flags a ready draft, a stale draft and today's event", () => {
    expect(
      eventGuidance(event({ status: "draft" }), now).map((g) => g.code),
    ).toContain("draftReady");
    expect(
      eventGuidance(
        event({
          status: "draft",
          startsAt: new Date(now.getTime() - day),
          endsAt: null,
        }),
        now,
      ).map((g) => g.code),
    ).toContain("draftPast");
    expect(
      eventGuidance(
        event({
          startsAt: new Date(now.getTime() + 2 * hour),
          endsAt: null,
        }),
        now,
      )[0],
    ).toEqual({ code: "startsToday", level: "attention" });
  });

  it("suggests the missing details", () => {
    const codes = eventGuidance(
      event({
        hasImage: false,
        locationDisplay: null,
        bookingUrl: null,
        endsAt: null,
        description: "Short one.",
      }),
      now,
    ).map((g) => g.code);
    expect(codes).toEqual([
      "noPicture",
      "noLocation",
      "noBooking",
      "noEnd",
      "thinDescription",
    ]);
  });
});

describe("grouping", () => {
  it("sorts each group sensibly and counts them", () => {
    const events = [
      event({ id: "late", startsAt: new Date(now.getTime() + 9 * day) }),
      event({ id: "soon", startsAt: new Date(now.getTime() + 2 * day) }),
      event({
        id: "old",
        startsAt: new Date(now.getTime() - 9 * day),
        endsAt: null,
      }),
      event({
        id: "older",
        startsAt: new Date(now.getTime() - 20 * day),
        endsAt: null,
      }),
      event({ id: "d", status: "draft" }),
    ];
    const groups = groupEvents(events, now);
    expect(groups.upcoming.map((e) => e.id)).toEqual(["soon", "late"]);
    expect(groups.past.map((e) => e.id)).toEqual(["old", "older"]);
    expect(countEvents(events, now)).toMatchObject({
      upcoming: 2,
      past: 2,
      draft: 1,
      total: 5,
    });
  });

  it("counts only upcoming owner-managed dates per series", () => {
    const counts = upcomingSeriesCounts(
      [
        event({ id: "a", seriesId: "s" }),
        event({ id: "b", seriesId: "s", status: "draft" }),
        event({ id: "c", seriesId: "s", status: "cancelled" }),
        event({
          id: "d",
          seriesId: "s",
          startsAt: new Date(now.getTime() - day),
        }),
        event({ id: "e", seriesId: null }),
      ],
      now,
    );
    expect(counts.get("s")).toBe(2);
    expect(counts.size).toBe(1);
  });
});

describe("parseEventForm", () => {
  const create = { now, isNew: true, goingLive: false };

  it("reads a valid form as UK time", () => {
    const parsed = parseEventForm(
      values({ endsAt: "2026-06-20T21:00" }),
      create,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // 19:00 BST is 18:00 UTC.
    expect(parsed.event.startsAt).toBe("2026-06-20T18:00:00.000Z");
    expect(parsed.event.endsAt).toBe("2026-06-20T20:00:00.000Z");
    expect(parsed.event.locationDisplay).toBeNull();
    expect(parsed.event.repeat).toBeNull();
  });

  it("names the field behind each problem", () => {
    const parsed = parseEventForm(
      values({
        title: "x",
        description: "y",
        locationDisplay: "z".repeat(eventLimits.locationMax + 1),
        bookingUrl: "javascript:alert(1)",
        startsAt: "",
      }),
      create,
    );
    expect(parsed).toMatchObject({
      ok: false,
      errors: {
        title: "titleShort",
        description: "descriptionShort",
        locationDisplay: "locationLong",
        bookingUrl: "urlInvalid",
        startsAt: "startRequired",
      },
    });
  });

  it("refuses unreal dates and an end before the start", () => {
    expect(
      parseEventForm(values({ startsAt: "2026-02-30T10:00" }), create),
    ).toMatchObject({ ok: false, errors: { startsAt: "dateInvalid" } });
    expect(
      parseEventForm(values({ endsAt: "2026-06-20T18:00" }), create),
    ).toMatchObject({ ok: false, errors: { endsAt: "endBeforeStart" } });
  });

  it("refuses a new or newly published event in the past, but not a tidy-up", () => {
    const past = values({ startsAt: "2026-06-01T10:00" });
    expect(parseEventForm(past, create)).toMatchObject({
      ok: false,
      errors: { startsAt: "startInPast" },
    });
    expect(
      parseEventForm(past, { now, isNew: false, goingLive: true }),
    ).toMatchObject({ ok: false, errors: { startsAt: "startInPast" } });
    expect(
      parseEventForm(values({ ...past, status: "cancelled" }), {
        now,
        isNew: false,
        goingLive: false,
      }).ok,
    ).toBe(true);
  });

  it("accepts a multi-day event that is still running", () => {
    expect(
      parseEventForm(
        values({ startsAt: "2026-06-09T10:00", endsAt: "2026-06-12T17:00" }),
        create,
      ).ok,
    ).toBe(true);
  });

  it("only lets a new event repeat, within bounds", () => {
    const repeating = values({
      repeatFrequency: "weekly",
      repeatOccurrences: "6",
    });
    const parsed = parseEventForm(repeating, create);
    expect(parsed.ok && parsed.event.repeat).toEqual({
      frequency: "weekly",
      occurrences: 6,
    });
    const edit = parseEventForm(repeating, {
      now,
      isNew: false,
      goingLive: false,
    });
    expect(edit.ok && edit.event.repeat).toBeNull();
    for (const bad of ["1", "27", "2.5", "abc", ""]) {
      expect(
        parseEventForm(
          values({ ...repeating, repeatOccurrences: bad }),
          create,
        ),
      ).toMatchObject({
        ok: false,
        errors: { repeatOccurrences: "occurrencesInvalid" },
      });
    }
  });

  it("ignores an unknown repeat frequency and unknown statuses", () => {
    const parsed = parseEventForm(
      values({ repeatFrequency: "daily", status: "removed" }),
      create,
    );
    expect(parsed.ok && parsed.event.repeat).toBeNull();
    expect(parsed.ok && parsed.event.status).toBe("draft");
  });

  it("never creates an event as cancelled, and applies to a series only on edit", () => {
    const created = parseEventForm(
      values({ status: "cancelled", applyToSeries: "on" }),
      create,
    );
    expect(created.ok && created.event.status).toBe("draft");
    expect(created.ok && created.event.applyToSeries).toBe(false);
    const edited = parseEventForm(
      values({ status: "cancelled", applyToSeries: "on" }),
      { now, isNew: false, goingLive: false },
    );
    expect(edited.ok && edited.event.status).toBe("cancelled");
    expect(edited.ok && edited.event.applyToSeries).toBe(true);
  });

  it("reads only strings from a form", () => {
    expect(
      readEventValues((name) => (name === "title" ? "Hi" : { evil: true })),
    ).toMatchObject({ title: "Hi", description: "" });
  });
});

describe("quick actions", () => {
  it("offers only sensible actions per state", () => {
    expect(actionsFor("draft")).toEqual(["publish", "duplicate"]);
    expect(actionsFor("past")).toEqual(["duplicate"]);
    expect(actionsFor("cancelled")).toContain("reopen");
    expect(actionsFor("upcoming")).toContain("postpone");
    expect(actionsFor("happening")).not.toContain("postpone");
  });

  it("recognises only known actions and postponements", () => {
    expect(isQuickAction("cancel")).toBe(true);
    expect(isQuickAction("delete")).toBe(false);
    expect(isQuickAction(undefined)).toBe(false);
    expect(isPostponeDays(7)).toBe(true);
    expect(isPostponeDays(3)).toBe(false);
  });
});

describe("dates", () => {
  it("keeps the UK wall-clock time across a clock change", () => {
    // 19:00 on the Saturday before clocks go back (25 Oct 2026).
    const before = new Date("2026-10-24T18:00:00Z");
    const after = shiftLondonDays(before, 7);
    expect(toLondonInput(after)).toBe("2026-10-31T19:00");
  });

  it("moves a copy to the next future week at the same time and length", () => {
    const original = {
      startsAt: new Date("2026-05-02T18:00:00Z"),
      endsAt: new Date("2026-05-02T20:30:00Z"),
    };
    const copy = copyDates(original, now);
    expect(copy.startsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(toLondonInput(copy.startsAt)).toMatch(/T19:00$/);
    expect(copy.endsAt!.getTime() - copy.startsAt.getTime()).toBe(2.5 * hour);
    expect(
      copyDates({ startsAt: copy.startsAt, endsAt: null }, now).endsAt,
    ).toBeNull();
  });

  it("keeps a copy's title within the limit", () => {
    const long = "t".repeat(eventLimits.titleMax);
    expect(duplicateTitle(long, "(copy)").length).toBeLessThanOrEqual(
      eventLimits.titleMax,
    );
    expect(duplicateTitle("Quiz", "(copy)")).toBe("Quiz (copy)");
  });
});
