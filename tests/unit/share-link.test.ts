import { describe, expect, it, vi } from "vitest";

import { shareOrCopyLink } from "@/lib/share-link";

const data = { title: "Test Cafe", url: "https://example.test/b/test-cafe" };

describe("shareOrCopyLink", () => {
  it("uses the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareOrCopyLink({ share, writeText }, data)).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("treats a deliberately dismissed share sheet as cancelled", async () => {
    const share = vi.fn(
      () =>
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new DOMException("dismissed", "AbortError")),
            500,
          ),
        ),
    );
    const writeText = vi.fn();
    expect(await shareOrCopyLink({ share, writeText }, data)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when the share API aborts immediately (no share targets)", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("no targets", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopyLink({ share, writeText }, data)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("falls back to copying when sharing fails or is missing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new Error("nope"));
    expect(await shareOrCopyLink({ share, writeText }, data)).toBe("copied");
    expect(await shareOrCopyLink({ writeText }, data)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("reports unavailable when neither path works", async () => {
    expect(await shareOrCopyLink({}, data)).toBe("unavailable");
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    expect(await shareOrCopyLink({ writeText }, data)).toBe("unavailable");
  });
});
