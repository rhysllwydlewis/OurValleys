import { describe, expect, it, vi } from "vitest";
import {
  getEmailDeliveryMode,
  resolveEmailDeliveryMode,
  sendTransactionalEmail,
} from "./email";

const message = {
  to: "member@example.com",
  subject: "Verify your email",
  text: "Select the link to verify: https://example.com/verify?token=abc",
};

describe("resolveEmailDeliveryMode", () => {
  it("uses Resend when an API key and sender are configured", () => {
    expect(
      resolveEmailDeliveryMode({
        NODE_ENV: "production",
        RESEND_API_KEY: "key",
        EMAIL_FROM: "OurValleys <hello@example.com>",
      }),
    ).toBe("resend");
  });

  it("falls back to the console transport outside production", () => {
    expect(resolveEmailDeliveryMode({ NODE_ENV: "development" })).toBe(
      "console",
    );
    expect(resolveEmailDeliveryMode({ NODE_ENV: "test" })).toBe("console");
  });

  it("is disabled in production without a configured provider", () => {
    expect(resolveEmailDeliveryMode({ NODE_ENV: "production" })).toBe(
      "disabled",
    );
    expect(
      resolveEmailDeliveryMode({
        NODE_ENV: "production",
        RESEND_API_KEY: "key",
      }),
    ).toBe("disabled");
    expect(
      resolveEmailDeliveryMode({
        NODE_ENV: "production",
        EMAIL_FROM: "hello@example.com",
      }),
    ).toBe("disabled");
  });
});

describe("getEmailDeliveryMode", () => {
  it("fails closed when the server environment cannot be read", () => {
    expect(
      getEmailDeliveryMode(() => {
        throw new Error("Invalid server environment configuration.");
      }),
    ).toBe("disabled");
  });
});

describe("sendTransactionalEmail", () => {
  it("fails closed when delivery is disabled", async () => {
    await expect(
      sendTransactionalEmail(message, {
        environment: { NODE_ENV: "production" },
      }),
    ).rejects.toThrow("Email delivery is not configured.");
  });

  it("logs instead of sending in the console mode", async () => {
    const logger = { info: vi.fn() };
    await sendTransactionalEmail(message, {
      environment: { NODE_ENV: "development" },
      logger,
    });
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]?.[0]).toContain(message.to);
    expect(logger.info.mock.calls[0]?.[0]).toContain(message.text);
  });

  it("posts to the Resend API when configured", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendTransactionalEmail(message, {
      environment: {
        NODE_ENV: "production",
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "OurValleys <hello@example.com>",
      },
      fetchImplementation,
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImplementation.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      from: "OurValleys <hello@example.com>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
    });
  });

  it("surfaces provider failures without leaking configuration", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 422 }));

    await expect(
      sendTransactionalEmail(message, {
        environment: {
          NODE_ENV: "production",
          RESEND_API_KEY: "test-key",
          EMAIL_FROM: "hello@example.com",
        },
        fetchImplementation,
      }),
    ).rejects.toThrow("Email delivery failed with status 422.");
  });
});
