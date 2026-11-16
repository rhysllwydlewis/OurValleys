import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  configured: true,
  getMediaObject: vi.fn(),
}));
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => storage.configured,
  getMediaObject: storage.getMediaObject,
}));

import { GET, HEAD } from "./route";

const id = "0b9d4f3e-6c1a-4c52-9a43-1f7a2d8e5b60";
const file = "7d2c9a54-3b1e-4f06-8a97-c5e0d1b2a3f4";
const goodKey = `business/${id}/gallery/${file}.png`;

const context = (key: string) => ({
  params: Promise.resolve({ key: key.split("/") }),
});
const request = new Request("https://ourvalleys.co.uk/media/x");

beforeEach(() => {
  storage.configured = true;
  storage.getMediaObject.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("GET /media/[...key]", () => {
  it("streams the file with a type taken from its extension, never the bucket", async () => {
    storage.getMediaObject.mockResolvedValue(
      new Response("PNGDATA", {
        status: 200,
        headers: {
          "content-type": "text/html",
          "content-length": "7",
          etag: '"abc"',
        },
      }),
    );

    const response = await GET(request, context(goodKey));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("PNGDATA");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("content-length")).toBe("7");
    expect(response.headers.get("etag")).toBe('"abc"');
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=86400, stale-while-revalidate=86400",
    );
    expect(storage.getMediaObject).toHaveBeenCalledWith(goodKey);
  });

  it("serves a menu PDF as a PDF", async () => {
    storage.getMediaObject.mockResolvedValue(new Response("%PDF"));
    const response = await GET(
      request,
      context(`business/${id}/documents/menu-${file}.pdf`),
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it.each([
    `../business/${id}/gallery/${file}.png`,
    `business/${id}/../../etc/passwd`,
    `secrets/${id}/${file}.png`,
    `business/${id}/gallery/${file}.html`,
    `business/${id}/gallery/${file}.svg`,
    `business/${id}/gallery/${file}`,
    `business/${id}`,
  ])("refuses %j without ever contacting the bucket", async (key) => {
    const response = await GET(request, context(key));
    expect(response.status).toBe(404);
    expect(storage.getMediaObject).not.toHaveBeenCalled();
  });

  it("answers 404 when storage is not configured, without contacting it", async () => {
    storage.configured = false;
    const response = await GET(request, context(goodKey));
    expect(response.status).toBe(404);
    expect(storage.getMediaObject).not.toHaveBeenCalled();
  });

  it("answers 404 for an object the bucket does not have", async () => {
    storage.getMediaObject.mockResolvedValue(new Response("", { status: 404 }));
    const response = await GET(request, context(goodKey));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it.each([403, 500, 503])(
    "answers a short-lived 503 when the bucket says %i, and logs only the status",
    async (status) => {
      storage.getMediaObject.mockResolvedValue(
        new Response("<Error>internal detail</Error>", { status }),
      );
      const response = await GET(request, context(goodKey));
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain("internal detail");
      expect(console.warn).toHaveBeenCalledWith(
        JSON.stringify({ event: "media_storage_error", status }),
      );
    },
  );

  it("answers 503 when the bucket cannot be reached", async () => {
    storage.getMediaObject.mockRejectedValue(
      new Error("ECONNRESET secret-host"),
    );
    const response = await GET(request, context(goodKey));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret-host");
  });
});

describe("HEAD /media/[...key]", () => {
  it("returns the same headers with no body", async () => {
    storage.getMediaObject.mockResolvedValue(
      new Response("PNGDATA", { headers: { "content-length": "7" } }),
    );
    const response = await HEAD(request, context(goodKey));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("7");
    expect(await response.text()).toBe("");
  });

  it("refuses an unsafe name the same way", async () => {
    const response = await HEAD(request, context(`business/${id}/../x.png`));
    expect(response.status).toBe(404);
    expect(storage.getMediaObject).not.toHaveBeenCalled();
  });
});
