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
