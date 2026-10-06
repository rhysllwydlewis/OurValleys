import { describe, expect, it } from "vitest";
import { replyTimeLabel, type EnquiryReplySample } from "./reply-time-label";

const now = new Date("2026-10-06T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function replied(hoursToReply: number, daysAgo = 10): EnquiryReplySample {
  const submittedAt = new Date(now.getTime() - daysAgo * DAY);
  return {
    status: "replied",
    submittedAt,
    firstRepliedAt: new Date(submittedAt.getTime() + hoursToReply * HOUR),
  };
}

function waiting(daysAgo: number): EnquiryReplySample {
  return {
    status: "new",
    submittedAt: new Date(now.getTime() - daysAgo * DAY),
    firstRepliedAt: null,
  };
}

describe("replyTimeLabel", () => {
  it("shows nothing below the minimum number of enquiries", () => {
    expect(
      replyTimeLabel([replied(1), replied(1), replied(1), replied(1)], now),
    ).toBeNull();
  });

  it("bands the median reply time", () => {
    const five = (hours: number) =>
      Array.from({ length: 5 }, () => replied(hours));
    expect(replyTimeLabel(five(2), now)).toBe(
      "Usually replies within a few hours",
    );
    expect(replyTimeLabel(five(20), now)).toBe("Usually replies within a day");
    expect(replyTimeLabel(five(50), now)).toBe(
      "Usually replies within a few days",
    );
  });

  it("never shows a negative label for slow businesses", () => {
    expect(
      replyTimeLabel(
        Array.from({ length: 6 }, () => replied(100)),
        now,
      ),
    ).toBeNull();
  });

  it("counts long-unanswered enquiries against the business", () => {
    const samples = [
      replied(1),
      replied(1),
      waiting(8),
      waiting(9),
      waiting(10),
    ];
    expect(replyTimeLabel(samples, now)).toBeNull();
  });

  it("ignores recent unanswered enquiries and rows with unknown reply time", () => {
    const samples = [
      replied(1),
      replied(1),
      replied(1),
      replied(1),
      waiting(1),
      {
        status: "replied",
        submittedAt: new Date(now.getTime() - 20 * DAY),
        firstRepliedAt: null,
      },
      {
        status: "archived",
        submittedAt: new Date(now.getTime() - 20 * DAY),
        firstRepliedAt: null,
      },
    ];
    expect(replyTimeLabel(samples, now)).toBeNull();
    expect(replyTimeLabel([...samples, replied(1)], now)).toBe(
      "Usually replies within a few hours",
    );
  });
});
