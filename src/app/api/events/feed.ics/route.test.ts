import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicEvents = vi.fn();
vi.mock("@/modules/events/public", () => ({
  listPublicEvents: (input: unknown) => listPublicEvents(input),
}));

import { GET } from "./route";

const ready = { state: "ready", events: [] };

describe("GET /api/events/feed.ics", () => {
  beforeEach(() => listPublicEvents.mockReset());

  it("passes a business slug filter, capped at 80 characters", async () => {
    listPublicEvents.mockResolvedValue(ready);
    await GET(
      new Request(
        `https://example.test/api/events/feed.ics?business=${"a".repeat(200)}`,
      ),
    );
    expect(listPublicEvents.mock.calls[0]![0].business).toBe("a".repeat(80));
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
});
