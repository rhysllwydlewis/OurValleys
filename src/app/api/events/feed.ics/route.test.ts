import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicEvents = vi.fn();
vi.mock("@/modules/events/public", () => ({
  listPublicEvents: (input: unknown) => listPublicEvents(input),
}));

import { GET } from "./route";

const ready = { state: "ready", events: [] };

describe("GET /api/events/feed.ics", () => {
  beforeEach(() => listPublicEvents.mockReset());

  it("passes a long business slug whole, capped at 200 characters", async () => {
    listPublicEvents.mockResolvedValue(ready);
    await GET(
      new Request(
        `https://example.test/api/events/feed.ics?business=${"a".repeat(300)}`,
      ),
    );
    expect(listPublicEvents.mock.calls[0]![0].business).toBe("a".repeat(200));
  });

  it("answers an unknown business with a valid empty calendar", async () => {
    listPublicEvents.mockResolvedValue(ready);
    const response = await GET(
      new Request("https://example.test/api/events/feed.ics?business=nope"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).not.toContain("BEGIN:VEVENT");
  });

  it("leaves the business filter unset when absent", async () => {
    listPublicEvents.mockResolvedValue(ready);
    await GET(new Request("https://example.test/api/events/feed.ics"));
    expect(listPublicEvents.mock.calls[0]![0].business).toBeUndefined();
  });

  it("reports 503 when events are unavailable", async () => {
    listPublicEvents.mockResolvedValue({ state: "unavailable", events: [] });
    const response = await GET(
      new Request("https://example.test/api/events/feed.ics?business=x"),
    );
    expect(response.status).toBe(503);
  });

  it("scopes the feed to a month, ignoring a quick range", async () => {
    listPublicEvents.mockResolvedValue(ready);
    const response = await GET(
      new Request(
        "https://example.test/api/events/feed.ics?month=2026-11&when=today",
      ),
    );
    const input = listPublicEvents.mock.calls[0]![0];
    expect(input.when).toBeUndefined();
    expect(input.window.from.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(input.window.to.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(response.headers.get("content-disposition")).toContain(
      "ourvalleys-events-2026-11.ics",
    );
  });

  it("scopes the feed to the Monday-to-Sunday week of any day given", async () => {
    listPublicEvents.mockResolvedValue(ready);
    const response = await GET(
      new Request("https://example.test/api/events/feed.ics?week=2026-11-05"),
    );
    const input = listPublicEvents.mock.calls[0]![0];
    expect(input.window.from.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(input.window.to.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(response.headers.get("content-disposition")).toContain(
      "ourvalleys-events-week-2026-11-02.ics",
    );
  });

  it("falls back to the plain feed for a malformed month or week", async () => {
    listPublicEvents.mockResolvedValue(ready);
    await GET(
      new Request("https://example.test/api/events/feed.ics?month=2026-13"),
    );
    await GET(
      new Request(
        "https://example.test/api/events/feed.ics?week=%22%3E%3Cscript%3E",
      ),
    );
    for (const call of listPublicEvents.mock.calls) {
      expect(call[0].window).toBeUndefined();
    }
  });
});
