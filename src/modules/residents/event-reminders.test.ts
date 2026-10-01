import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { composeEventReminderEmail } from "./event-reminders";

const siteUrl = new URL("https://ourvalleys.example");
const unsubscribeUrl = "https://ourvalleys.example/unsubscribe/x";

describe("composeEventReminderEmail", () => {
  it("names a single event in the subject and links to it", () => {
    const { subject, text } = composeEventReminderEmail(
      [
        {
          id: "e1",
          title: "Quiz Night",
          businessName: "The Hall",
          startsAt: new Date("2026-10-02T18:30:00Z"),
        },
      ],
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe("Reminder: Quiz Night");
    expect(text).toContain("https://ourvalleys.example/events/e1");
    expect(text).toContain("19:30");
    expect(text).toContain(unsubscribeUrl);
  });

  it("counts events in the subject when there are several", () => {
    const event = {
      id: "e",
      title: "T",
      businessName: "B",
      startsAt: new Date("2026-10-02T18:30:00Z"),
    };
    const { subject } = composeEventReminderEmail(
      [event, { ...event, id: "f" }],
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe("2 events you saved are coming up");
  });
});
