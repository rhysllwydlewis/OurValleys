import { describe, expect, it } from "vitest";
import {
  parsePromotableDraft,
  toWeeklyRules,
  upcomingExceptions,
} from "@/modules/businesses/draft-promotion";

const placeId = "00000000-0000-4000-8000-000000000301";
const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function validRow() {
  return {
    profile: {
      tradingName: "Cwm Valley Cycles",
      summary: "Independent cycle repairs and servicing for riders.",
    },
    location: {
      placeId,
      locationType: "service_area",
      publicAddressVisibility: "service_area_only",
    },
    services: [{ name: "Bike servicing" }],
    hours: weekdays.map((day) => ({
      day,
      closed: true,
      opensAt: null,
      closesAt: null,
    })),
    exceptionalHours: null,
  };
}

describe("parsePromotableDraft", () => {
  it("accepts a complete draft and defaults exceptional hours to none", () => {
    const draft = parsePromotableDraft(validRow());
    expect(draft?.exceptionalHours).toEqual([]);
    expect(draft?.profile.publicPhone).toBeNull();
    expect(draft?.services[0]?.priceGuidance).toBeNull();
  });

  it.each([
    ["profile", { profile: null }],
    ["location", { location: null }],
    ["services", { services: [] }],
    ["hours", { hours: validRow().hours.slice(0, 3) }],
    [
      "a location without a place",
      { location: { ...validRow().location, placeId: "not-a-uuid" } },
    ],
    [
      "a too-short summary",
      { profile: { ...validRow().profile, summary: "Too short" } },
    ],
    [
      "a closing time before opening",
      {
        hours: validRow().hours.map((day, index) =>
          index === 0
            ? {
                day: day.day,
                closed: false,
                opensAt: "17:00",
                closesAt: "09:00",
              }
            : day,
        ),
      },
    ],
    [
      "duplicate exceptional dates",
      {
        exceptionalHours: [
          { date: "2026-12-25", closed: true, opensAt: null, closesAt: null },
          { date: "2026-12-25", closed: true, opensAt: null, closesAt: null },
        ],
      },
    ],
  ])("rejects %s so nothing half-complete is published", (_name, override) => {
    expect(parsePromotableDraft({ ...validRow(), ...override })).toBeNull();
  });
});

describe("toWeeklyRules", () => {
  it("numbers days with Sunday as 0 and drops times on closed days", () => {
    const rules = toWeeklyRules([
      { day: "sunday", closed: true, opensAt: null, closesAt: null },
      { day: "monday", closed: false, opensAt: "09:00", closesAt: "17:00" },
      { day: "saturday", closed: false, opensAt: "10:00", closesAt: "14:00" },
    ]);
    expect(rules).toEqual([
      { dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null },
      { dayOfWeek: 1, isClosed: false, opensAt: "09:00", closesAt: "17:00" },
      { dayOfWeek: 6, isClosed: false, opensAt: "10:00", closesAt: "14:00" },
    ]);
  });
});

describe("upcomingExceptions", () => {
  const exceptions = [
    {
      date: "2026-12-24",
      closed: false,
      opensAt: "09:00",
      closesAt: "12:00",
      note: null,
    },
    {
      date: "2026-12-25",
      closed: true,
      opensAt: null,
      closesAt: null,
      note: "Christmas",
    },
    {
      date: "2026-12-01",
      closed: true,
      opensAt: null,
      closesAt: null,
      note: "Past",
    },
  ];

  it("keeps today and later London dates and drops earlier ones", () => {
    const result = upcomingExceptions(
      exceptions,
      new Date("2026-12-24T10:00:00Z"),
    );
    expect(result.map((item) => item.date)).toEqual([
      "2026-12-24",
      "2026-12-25",
    ]);
    expect(result[1]).toEqual({
      date: "2026-12-25",
      isClosed: true,
      opensAt: null,
      closesAt: null,
      note: "Christmas",
    });
  });

  it("uses the London date, not UTC, to decide what is past", () => {
    // 23:30 UTC on 23 Dec in winter is still 23 Dec in London.
    const winter = upcomingExceptions(
      [
        {
          date: "2026-12-23",
          closed: true,
          opensAt: null,
          closesAt: null,
          note: null,
        },
      ],
      new Date("2026-12-23T23:30:00Z"),
    );
    expect(winter).toHaveLength(1);
    // 23:30 UTC on 1 Jul is already 2 Jul in London (BST).
    const summer = upcomingExceptions(
      [
        {
          date: "2026-07-01",
          closed: true,
          opensAt: null,
          closesAt: null,
          note: null,
        },
      ],
      new Date("2026-07-01T23:30:00Z"),
    );
    expect(summer).toHaveLength(0);
  });
});
