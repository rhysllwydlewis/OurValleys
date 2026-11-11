import { beforeEach, describe, expect, it, vi } from "vitest";

const render = vi.fn((input: unknown) => input);
const getPublicEvent = vi.fn();

vi.mock("@/lib/page-share-image", () => ({
  pageShareImageContentType: "image/png",
  pageShareImageSize: { width: 1200, height: 630 },
  renderPageShareImage: (input: unknown) => render(input),
}));
vi.mock("@/lib/i18n/server", () => ({
  getTranslator: async () => ({ locale: "en" }),
}));
vi.mock("@/modules/events/public", () => ({
  getPublicEvent: (...args: unknown[]) => getPublicEvent(...args),
}));

import Image from "./opengraph-image";

describe("event share image", () => {
  beforeEach(() => {
    render.mockClear();
    getPublicEvent.mockReset();
  });

  it("draws only public event text", async () => {
    getPublicEvent.mockResolvedValue({
      state: "found",
      event: {
        title: "Valleys Folk Night",
        businessName: "The Ivor Arms",
        locationDisplay: "Pontypridd",
        startsAt: new Date("2026-12-05T19:30:00Z"),
      },
    });
    await Image({ params: Promise.resolve({ eventId: "e1" }) });
    expect(render).toHaveBeenCalledWith({
      eyebrow: "Local event · Sat 5 December at 19:30",
      title: "Valleys Folk Night",
      summary: "The Ivor Arms · Pontypridd",
    });
  });

  it.each(["not_found", "unavailable"])(
    "falls back to the generic card when %s",
    async (state) => {
      getPublicEvent.mockResolvedValue({ state });
      await Image({ params: Promise.resolve({ eventId: "e1" }) });
      expect(render).toHaveBeenCalledWith({
        eyebrow: "Rhondda Cynon Taf",
        title: "OurValleys",
      });
    },
  );
});
