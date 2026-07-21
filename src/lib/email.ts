import "server-only";
import { getServerEnvironment } from "@/lib/env";

/**
 * Transactional email delivery.
 *
 * Modes:
 * - "resend": both RESEND_API_KEY and EMAIL_FROM are configured, so messages
 *   are delivered through the Resend HTTP API (ADR-0007).
 * - "console": no provider is configured outside production, so messages are
 *   written to the server log to keep local verification journeys testable.
 * - "disabled": no provider is configured in production. Sending fails and
 *   journeys that depend on delivery (public registration) must stay closed
 *   rather than create accounts that can never verify.
 */
export type EmailDeliveryMode = "resend" | "console" | "disabled";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
};

type EmailEnvironment = {
  NODE_ENV: "development" | "test" | "production";
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function resolveEmailDeliveryMode(
  environment: EmailEnvironment,
): EmailDeliveryMode {
  if (environment.RESEND_API_KEY && environment.EMAIL_FROM) return "resend";
  if (environment.NODE_ENV !== "production") return "console";
  return "disabled";
}

export function getEmailDeliveryMode(): EmailDeliveryMode {
  return resolveEmailDeliveryMode(getServerEnvironment());
}

/**
 * Public self-service registration is only open when a verification email can
 * actually reach the user, so it follows the delivery mode fail-closed.
 */
export function isRegistrationOpen(): boolean {
  return getEmailDeliveryMode() !== "disabled";
}

type SendOptions = {
  environment?: EmailEnvironment;
  fetchImplementation?: typeof fetch;
  logger?: Pick<Console, "info">;
};

export async function sendTransactionalEmail(
  message: TransactionalEmail,
  options: SendOptions = {},
): Promise<void> {
  const environment = options.environment ?? getServerEnvironment();
  const mode = resolveEmailDeliveryMode(environment);

  if (mode === "disabled") {
    throw new Error("Email delivery is not configured.");
  }

  if (mode === "console") {
    const logger = options.logger ?? console;
    logger.info(
      `[email:console] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
    );
    return;
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: environment.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}.`);
  }
}
