import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendWithRetry } from "./email-retry";

const message = {
  to: "resident@example.com",
  subject: "Cancelled",
  text: "Body",
  category: "event_cancellation",
};

afterEach(() => vi.restoreAllMocks());

describe("sendWithRetry", () => {
  it("returns true without waiting when the first send works", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const sleep = vi.fn();
    await expect(sendWithRetry(message, { send, sleep })).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries a transient failure with a doubling wait", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("Resend 503"))
      .mockRejectedValueOnce(new Error("Resend 503"))
      .mockResolvedValue(undefined);
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      sendWithRetry(message, { send, sleep, baseDelayMs: 100 }),
    ).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it("gives up after the attempts and logs without the address", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi.fn().mockRejectedValue(new Error("Resend 503"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(sendWithRetry(message, { send, sleep })).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(3);
    const logged = log.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).not.toContain("resident@example.com");
    expect(logged).toContain("event_cancellation");
  });

  it("does not retry when email delivery is not configured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi
      .fn()
      .mockRejectedValue(new Error("Email delivery is not configured."));
    const sleep = vi.fn();
    await expect(sendWithRetry(message, { send, sleep })).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
