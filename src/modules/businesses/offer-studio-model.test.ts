import { describe, expect, it } from "vitest";
import {
  actionsFor,
  countOffers,
  duplicateTitle,
  extendedEnd,
  groupOffers,
  londonCalendarDays,
  offerGuidance,
  offerState,
  parseLondonInput,
  parseOfferForm,
  toLondonInput,
  type OfferFormValues,
  type StudioOffer,
} from "./offer-studio-model";

const now = new Date("2026-10-20T12:00:00Z");
const day = 86_400_000;

function offer(overrides: Partial<StudioOffer> = {}): StudioOffer {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Free boiler check",
    description: "A free check of your boiler with any annual service booked.",
    terms: null,
    actionLabel: null,
    actionUrl: null,
    startsAt: null,
    endsAt: null,
    status: "active",
    hasImage: true,
    ...overrides,
  };
}

const goodForm: OfferFormValues = {
  title: "Autumn tune-up",
  description: "Book a tune-up before the cold arrives.",
  terms: "",
  actionUrl: "",
  actionLabel: "",
  startsAt: "",
  endsAt: "",
  status: "active",
};

describe("offerState", () => {
  it("mirrors the public listing rule", () => {
    expect(offerState(offer(), now)).toBe("live");
    expect(offerState(offer({ status: "draft" }), now)).toBe("draft");
    expect(offerState(offer({ status: "hidden" }), now)).toBe("paused");
    expect(
      offerState(offer({ endsAt: new Date(now.getTime() - 1) }), now),
    ).toBe("ended");
    expect(
      offerState(offer({ startsAt: new Date(now.getTime() + day) }), now),
    ).toBe("scheduled");
    // A paused or draft offer stays paused or draft even after its end.
    expect(
      offerState(
        offer({ status: "hidden", endsAt: new Date(now.getTime() - day) }),
        now,
      ),
    ).toBe("paused");
  });

  it("treats the boundary instants as live", () => {
    expect(offerState(offer({ endsAt: now }), now)).toBe("live");
    expect(offerState(offer({ startsAt: now }), now)).toBe("live");
  });
});

describe("offerGuidance", () => {
  it("flags an offer ending within a day as needing a decision", () => {
    const guidance = offerGuidance(
      offer({ endsAt: new Date(now.getTime() + day / 2) }),
      now,
    );
    expect(guidance[0]).toEqual({ code: "endsToday", level: "attention" });
  });

  it("flags endings within a week and suggests an end date when none", () => {
    expect(
      offerGuidance(
        offer({ endsAt: new Date(now.getTime() + 5 * day) }),
        now,
      )[0]?.code,
    ).toBe("endsSoon");
    expect(offerGuidance(offer(), now)[0]?.code).toBe("noEnd");
    expect(
      offerGuidance(offer({ endsAt: new Date(now.getTime() + 20 * day) }), now),
    ).not.toContainEqual(expect.objectContaining({ code: "noEnd" }));
  });

  it("gives an ended offer no tips, and a complete draft a publish prompt", () => {
    expect(
      offerGuidance(offer({ endsAt: new Date(now.getTime() - day) }), now),
    ).toEqual([]);
    expect(offerGuidance(offer({ status: "draft" }), now)[0]).toEqual({
      code: "draftReady",
      level: "attention",
    });
  });

  it("suggests a picture, a link and more detail when they are missing", () => {
    const codes = offerGuidance(
      offer({ hasImage: false, description: "Short text" }),
      now,
    ).map((item) => item.code);
    expect(codes).toEqual(
      expect.arrayContaining(["noPicture", "noLink", "thinDescription"]),
    );
  });
});

describe("groupOffers and countOffers", () => {
  it("orders live by earliest end and ended by most recent", () => {
    const a = offer({ id: "a", endsAt: new Date(now.getTime() + 9 * day) });
    const b = offer({ id: "b", endsAt: new Date(now.getTime() + 2 * day) });
    const c = offer({ id: "c" });
    const e1 = offer({ id: "e1", endsAt: new Date(now.getTime() - 9 * day) });
    const e2 = offer({ id: "e2", endsAt: new Date(now.getTime() - 2 * day) });
    const groups = groupOffers([a, c, b, e1, e2], now);
    expect(groups.live.map((o) => o.id)).toEqual(["b", "a", "c"]);
    expect(groups.ended.map((o) => o.id)).toEqual(["e2", "e1"]);
    expect(countOffers([a, c, b, e1, e2], now)).toMatchObject({
      live: 3,
      ended: 2,
      total: 5,
    });
  });
});

describe("London date handling", () => {
  it("reads a winter time as UTC and a summer time as UTC+1", () => {
    expect(parseLondonInput("2026-01-15T09:30")).toEqual(
      new Date("2026-01-15T09:30:00Z"),
    );
    expect(parseLondonInput("2026-07-15T09:30")).toEqual(
      new Date("2026-07-15T08:30:00Z"),
    );
  });

  it("round-trips through the input format", () => {
    for (const text of ["2026-01-15T09:30", "2026-07-15T23:59"]) {
      const parsed = parseLondonInput(text);
      expect(parsed).toBeInstanceOf(Date);
      expect(toLondonInput(parsed as Date)).toBe(text);
    }
  });

  it("takes the first of a repeated autumn hour", () => {
    // Clocks go back at 02:00 BST on 25 October 2026, so 01:30 happens twice.
    expect(parseLondonInput("2026-10-25T01:30")).toEqual(
      new Date("2026-10-25T00:30:00Z"),
    );
  });

  it("moves a skipped spring time forward an hour", () => {
    // 01:30 on 29 March 2026 does not exist; 02:30 BST is 01:30 UTC.
    expect(parseLondonInput("2026-03-29T01:30")).toEqual(
      new Date("2026-03-29T01:30:00Z"),
    );
  });

  it("returns null for blank and invalid for impossible dates", () => {
    expect(parseLondonInput("")).toBeNull();
    expect(parseLondonInput("  ")).toBeNull();
    expect(parseLondonInput("2026-02-30T10:00")).toBe("invalid");
    expect(parseLondonInput("2026-13-01T10:00")).toBe("invalid");
    expect(parseLondonInput("tomorrow")).toBe("invalid");
    expect(parseLondonInput("2026-01-15T25:00")).toBe("invalid");
  });

  it("shows nothing for a missing or invalid date", () => {
    expect(toLondonInput(null)).toBe("");
    expect(toLondonInput(new Date(Number.NaN))).toBe("");
  });
});

describe("parseOfferForm", () => {
  const options = { now, allowPastEnd: false };

  it("accepts a minimal offer and trims it", () => {
    const parsed = parseOfferForm(
      { ...goodForm, title: "  Autumn tune-up  " },
      options,
    );
    expect(parsed).toMatchObject({
      ok: true,
      offer: { title: "Autumn tune-up", terms: null, actionUrl: null },
    });
  });

  it("names each wrong field", () => {
    const parsed = parseOfferForm(
      {
        ...goodForm,
        title: "x",
        description: "no",
        actionUrl: "javascript:alert(1)",
        startsAt: "2026-02-30T10:00",
      },
      options,
    );
    expect(parsed).toEqual({
      ok: false,
      errors: {
        title: "titleShort",
        description: "descriptionShort",
        actionUrl: "urlInvalid",
        startsAt: "dateInvalid",
      },
    });
  });

  it("refuses links that are not http or https", () => {
    for (const actionUrl of [
      "ftp://example.test",
      "data:text/html,hi",
      "//x",
    ]) {
      expect(parseOfferForm({ ...goodForm, actionUrl }, options)).toMatchObject(
        {
          ok: false,
          errors: { actionUrl: "urlInvalid" },
        },
      );
    }
  });

  it("drops a button label when there is no link", () => {
    const parsed = parseOfferForm(
      { ...goodForm, actionLabel: "Book now" },
      options,
    );
    expect(parsed).toMatchObject({ ok: true, offer: { actionLabel: null } });
    const linked = parseOfferForm(
      { ...goodForm, actionLabel: "Book now", actionUrl: "https://a.example" },
      options,
    );
    expect(linked).toMatchObject({
      ok: true,
      offer: { actionLabel: "Book now", actionUrl: "https://a.example" },
    });
  });

  it("requires the end to follow the start", () => {
    expect(
      parseOfferForm(
        {
          ...goodForm,
          startsAt: "2026-11-02T10:00",
          endsAt: "2026-11-01T10:00",
        },
        options,
      ),
    ).toMatchObject({ ok: false, errors: { endsAt: "endBeforeStart" } });
  });

  it("refuses a past end for new offers but lets an ended offer be edited", () => {
    const values = { ...goodForm, endsAt: "2026-10-01T10:00" };
    expect(parseOfferForm(values, options)).toMatchObject({
      ok: false,
      errors: { endsAt: "endInPast" },
    });
    expect(parseOfferForm(values, { now, allowPastEnd: true })).toMatchObject({
      ok: true,
    });
  });

  it("falls back to draft for an unknown status", () => {
    expect(
      parseOfferForm({ ...goodForm, status: "published" }, options),
    ).toMatchObject({ ok: true, offer: { status: "draft" } });
  });

  it("enforces the length limits", () => {
    expect(
      parseOfferForm(
        {
          ...goodForm,
          title: "t".repeat(121),
          description: "d".repeat(1001),
          terms: "x".repeat(1001),
          actionLabel: "l".repeat(51),
        },
        options,
      ),
    ).toMatchObject({
      ok: false,
      errors: {
        title: "titleLong",
        description: "descriptionLong",
        terms: "termsLong",
        actionLabel: "labelLong",
      },
    });
  });
});

/** The same wall-clock text `days` later, by calendar arithmetic. */
function shiftDays(text: string, days: number): string {
  const [date, time] = text.split("T") as [string, string];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return `${moved.toISOString().slice(0, 10)}T${time}`;
}

describe("quick actions", () => {
  it("offers only sensible actions in each state", () => {
    expect(actionsFor("ended")).toEqual(["duplicate"]);
    expect(actionsFor("draft")).toContain("publish");
    expect(actionsFor("paused")).toContain("resume");
    expect(actionsFor("live")).not.toContain("publish");
  });

  it("extends from the later of the current end and now", () => {
    const future = new Date(now.getTime() + 2 * day);
    expect(toLondonInput(extendedEnd(future, 7, now))).toBe(
      shiftDays(toLondonInput(future), 7),
    );
    const past = new Date(now.getTime() - 5 * day);
    expect(toLondonInput(extendedEnd(past, 7, now))).toBe(
      shiftDays(toLondonInput(now), 7),
    );
  });

  it("keeps the UK wall-clock time across a clock change", () => {
    // 23:59 BST on 22 October; seven days on, the clocks have gone back.
    const end = new Date("2026-10-22T22:59:00Z");
    const extended = extendedEnd(end, 7, new Date("2026-10-20T12:00:00Z"));
    expect(toLondonInput(extended)).toBe("2026-10-29T23:59");
  });

  it("refuses to extend with no end date or an unlisted length", () => {
    expect(extendedEnd(null, 7, now)).toBeNull();
    expect(extendedEnd(new Date(now.getTime() + day), 5, now)).toBeNull();
  });

  it("keeps a copy's title within the limit", () => {
    expect(duplicateTitle("Spring sale", "(copy)")).toBe("Spring sale (copy)");
    const long = duplicateTitle("a".repeat(120), "(copy)");
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith("(copy)")).toBe(true);
  });
});

describe("londonCalendarDays", () => {
  it("counts UK calendar days, not 24-hour periods", () => {
    // 00:30 UK on the 20th. 23:00 UK on the 21st is nearly 47 hours away but
    // is tomorrow's tomorrow by the calendar; 23:00 on the 20th is today.
    const justAfterMidnight = new Date("2026-10-19T23:30:00Z");
    expect(
      londonCalendarDays(new Date("2026-10-20T22:00:00Z"), justAfterMidnight),
    ).toBe(0);
    expect(
      londonCalendarDays(new Date("2026-10-21T22:00:00Z"), justAfterMidnight),
    ).toBe(1);
    expect(londonCalendarDays(justAfterMidnight, justAfterMidnight)).toBe(0);
  });

  it("is not thrown by a clock change", () => {
    // 23:30 UK on 24 October to 23:30 UK on 26 October spans the change.
    expect(
      londonCalendarDays(
        new Date("2026-10-26T23:30:00Z"),
        new Date("2026-10-24T22:30:00Z"),
      ),
    ).toBe(2);
  });
});
