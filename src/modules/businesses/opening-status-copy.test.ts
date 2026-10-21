import { describe, expect, it } from "vitest";
import { translatorFor } from "@/lib/i18n/translate";
import { buildSchedule, openingStatus } from "./opening-status";
import { describeOpeningStatus } from "./opening-status-copy";

const weekly = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: false,
  opensAt: "09:00",
  closesAt: "17:00",
}));
const christmas = {
  date: "2026-12-25",
  isClosed: true,
  opensAt: null,
  closesAt: null,
  note: "Christmas Day",
};

describe("describeOpeningStatus", () => {
  const at = (iso: string) =>
    describeOpeningStatus(
      openingStatus(buildSchedule(weekly, [christmas]), new Date(iso)),
      translatorFor("en"),
    );

  it("keeps the reopening time beside a closure note", () => {
    // Friday 25 Dec 2026, reopens Monday 28th.
    expect(at("2026-12-25T11:00:00Z")).toMatchObject({
      text: "Closed today · opens Monday at 09:00",
      note: "Christmas Day",
    });
  });

  it("does not call a finished special-hours day an all-day closure", () => {
    const status = describeOpeningStatus(
      openingStatus(
        buildSchedule(weekly, [
          {
            date: "2026-12-24",
            isClosed: false,
            opensAt: "09:00",
            closesAt: "12:00",
            note: "Christmas hours",
          },
        ]),
        new Date("2026-12-24T14:00:00Z"), // 14:00, after the short day
      ),
      translatorFor("en"),
    );
    expect(status?.text).toBe("Closed now · opens tomorrow at 09:00");
    expect(status?.text).not.toContain("Closed today");
  });

  it("adds the date once the next opening is a week or more away", () => {
    // Only Wednesdays open; the next two are closed by special days.
    const status = describeOpeningStatus(
      openingStatus(
        buildSchedule(
          [
            {
              dayOfWeek: 3,
              isClosed: false,
              opensAt: "09:00",
              closesAt: "17:00",
            },
          ],
          [
            {
              date: "2026-07-22",
              isClosed: true,
              opensAt: null,
              closesAt: null,
              note: null,
            },
          ],
        ),
        new Date("2026-07-15T18:00:00Z"), // Wednesday evening
      ),
      translatorFor("en"),
    );
    expect(status?.text).toBe("Closed now · opens Wednesday 29 Jul at 09:00");
  });

  it("says nothing when no hours exist", () => {
    expect(
      describeOpeningStatus(
        openingStatus(buildSchedule([], []), new Date()),
        translatorFor("en"),
      ),
    ).toBeNull();
  });

  it("speaks Welsh", () => {
    expect(
      describeOpeningStatus(
        openingStatus(
          buildSchedule(weekly, []),
          new Date("2026-07-15T10:00:00Z"),
        ),
        translatorFor("cy"),
      )?.text,
    ).toBe("Ar agor nawr · yn cau am 17:00");
  });
});
