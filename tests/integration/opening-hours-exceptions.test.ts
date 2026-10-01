import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { openingHoursException } from "@/lib/database/schema/business";
import {
  addDaysToDateString,
  londonDateString,
} from "@/modules/businesses/opening-hours-exceptions";
import {
  getPublishedBusinessBySlug,
  listPublishedBusinesses,
} from "@/modules/businesses/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  businessId: "00000000-0000-4000-8000-000000000401",
  businessSlug: "cwm-coil-heating",
  locationId: "00000000-0000-4000-8000-000000000701",
} as const;

type NewException = {
  date: string;
  isClosed: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  note?: string | null;
};

async function addException(row: NewException) {
  await getDatabase()
    .insert(openingHoursException)
    .values({
      businessLocationId: fixture.locationId,
      date: row.date,
      isClosed: row.isClosed,
      opensAt: row.opensAt ?? null,
      closesAt: row.closesAt ?? null,
      note: row.note ?? null,
    });
}

async function isListedOpenAt(now: Date): Promise<boolean> {
  const result = await listPublishedBusinesses({
    query: "heating",
    openNow: true,
    now,
  });
  expect(result.state).toBe("ready");
  if (result.state !== "ready") return false;
  return result.businesses.some((record) => record.id === fixture.businessId);
}

// The seeded weekly rule is Mon-Fri 08:00-16:00 and closed at weekends.
const wednesdayMorning = new Date(Date.UTC(2026, 0, 14, 10, 0));
const sundayMorning = new Date(Date.UTC(2026, 0, 18, 10, 0));

describeDatabase("opening hours exceptions", () => {
  afterEach(async () => {
    await getDatabase()
      .delete(openingHoursException)
      .where(eq(openingHoursException.businessLocationId, fixture.locationId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("is open on a normal weekday with no exception (baseline)", async () => {
    expect(await isListedOpenAt(wednesdayMorning)).toBe(true);
  });

  it("is not open on a bank-holiday closure that overrides the weekly rule", async () => {
    await addException({ date: "2026-01-14", isClosed: true });
    expect(await isListedOpenAt(wednesdayMorning)).toBe(false);
  });

  it("is open on a day the weekly rule closes when special hours are set", async () => {
    await addException({
      date: "2026-01-18",
      isClosed: false,
      opensAt: "10:00",
      closesAt: "14:00",
    });
    expect(await isListedOpenAt(sundayMorning)).toBe(true);
    expect(await isListedOpenAt(new Date(Date.UTC(2026, 0, 18, 15, 0)))).toBe(
      false,
    );
  });

  it("replaces the weekly hours entirely rather than extending them", async () => {
    await addException({
      date: "2026-01-14",
      isClosed: false,
      opensAt: "12:00",
      closesAt: "13:00",
    });
    // 10:00 is inside the weekly 08:00-16:00 but outside the exception.
    expect(await isListedOpenAt(wednesdayMorning)).toBe(false);
    expect(await isListedOpenAt(new Date(Date.UTC(2026, 0, 14, 12, 30)))).toBe(
      true,
    );
  });

  it("ignores exceptions for other dates", async () => {
    await addException({ date: "2026-01-15", isClosed: true });
    expect(await isListedOpenAt(wednesdayMorning)).toBe(true);
  });

  it("resolves the exception against the London date during British Summer Time", async () => {
    // 23:30 UTC on Wed 15 July is 00:30 BST on Thu 16 July. The weekly rule
    // would say closed; only a 16 July exception can make it open.
    await addException({
      date: "2026-07-16",
      isClosed: false,
      opensAt: "00:00",
      closesAt: "06:00",
    });
    expect(await isListedOpenAt(new Date(Date.UTC(2026, 6, 15, 23, 30)))).toBe(
      true,
    );

    // 17:30 BST on Wed 15 July: past the weekly 16:00 close, so the late
    // special hours are what keep the business open.
    await addException({
      date: "2026-07-15",
      isClosed: false,
      opensAt: "08:00",
      closesAt: "19:00",
    });
    expect(await isListedOpenAt(new Date(Date.UTC(2026, 6, 15, 16, 30)))).toBe(
      true,
    );
  });

  it("rejects rows the public logic could misread", async () => {
    await expect(
      addException({
        date: "2026-02-01",
        isClosed: true,
        opensAt: "09:00",
        closesAt: "17:00",
      }),
    ).rejects.toThrow();
    await expect(
      addException({ date: "2026-02-02", isClosed: false }),
    ).rejects.toThrow();
    await expect(
      addException({
        date: "2026-02-03",
        isClosed: false,
        opensAt: "17:00",
        closesAt: "09:00",
      }),
    ).rejects.toThrow();
    await expect(
      addException({
        date: "2026-02-04",
        isClosed: false,
        opensAt: "9am",
        closesAt: "17:00",
      }),
    ).rejects.toThrow();
    await expect(
      addException({
        date: "2026-02-05",
        isClosed: true,
        note: "x".repeat(121),
      }),
    ).rejects.toThrow();
  });

  it("allows only one exception per location and date", async () => {
    await addException({ date: "2026-03-01", isClosed: true });
    await expect(
      addException({ date: "2026-03-01", isClosed: true }),
    ).rejects.toThrow();
  });

  it("publishes only the next fortnight of exceptions, soonest first", async () => {
    const today = londonDateString(new Date());
    await addException({
      date: addDaysToDateString(today, -1),
      isClosed: true,
      note: "past",
    });
    await addException({
      date: addDaysToDateString(today, 10),
      isClosed: false,
      opensAt: "10:00",
      closesAt: "12:00",
      note: "later",
    });
    await addException({
      date: addDaysToDateString(today, 3),
      isClosed: true,
      note: "soon",
    });
    await addException({
      date: addDaysToDateString(today, 15),
      isClosed: true,
      note: "too far",
    });

    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);
    expect(detail.state).toBe("ready");
    if (detail.state !== "ready") return;
    expect(
      detail.business.openingExceptions.map((exception) => exception.note),
    ).toEqual(["soon", "later"]);
    expect(detail.business.openingExceptions[0]).toMatchObject({
      date: addDaysToDateString(today, 3),
      display: "Closed",
    });
    expect(detail.business.openingExceptions[1]?.display).toBe("10:00–12:00");
  });
});
