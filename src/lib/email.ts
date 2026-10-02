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
  replyTo?: string;
  /**
   * Coarse purpose of the message (for example "auth" or "enquiry"), recorded
   * in the delivery log so admins can see which journeys are failing. Never
   * sent to the provider.
   */
  category?: string;
};

export type EmailDeliveryOutcome = {
  category: string;
  mode: Exclude<EmailDeliveryMode, "console">;
  status: "sent" | "failed";
  error?: string;
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

export function getEmailDeliveryMode(
  readEnvironment: () => EmailEnvironment = getServerEnvironment,
): EmailDeliveryMode {
  let environment: EmailEnvironment;
  try {
    environment = readEnvironment();
  } catch {
    // An invalid or missing server environment must degrade to the closed
    // state, not crash public pages that only ask whether registration is
    // open (the unconfigured runtime still serves honest fallbacks).
    return "disabled";
  }
  return resolveEmailDeliveryMode(environment);
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
  /** Overrides the default database delivery log (tests). */
  recordOutcome?: (outcome: EmailDeliveryOutcome) => Promise<void>;
};

/**
 * Best-effort: a logging failure must never change whether the email journey
 * succeeds, and the log carries no recipient address or message content.
 */
async function recordDeliveryOutcome(
  outcome: EmailDeliveryOutcome,
  options: SendOptions,
): Promise<void> {
  try {
    if (options.recordOutcome) {
      await options.recordOutcome(outcome);
      return;
    }
    const { recordEmailDelivery } =
      await import("@/modules/platform/email-delivery-log");
    await recordEmailDelivery(outcome);
  } catch {
    // Intentionally ignored; see above.
  }
}

export async function sendTransactionalEmail(
  message: TransactionalEmail,
  options: SendOptions = {},
): Promise<void> {
  const environment = options.environment ?? getServerEnvironment();
  const mode = resolveEmailDeliveryMode(environment);

  const category = message.category ?? "other";

  if (mode === "disabled") {
    await recordDeliveryOutcome(
      {
        category,
        mode,
        status: "failed",
        error: "Email delivery is not configured.",
      },
      options,
    );
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
  let response: Response;
  try {
    response = await fetchImplementation(RESEND_ENDPOINT, {
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
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
  } catch (error) {
    await recordDeliveryOutcome(
      { category, mode, status: "failed", error: "Provider unreachable." },
      options,
    );
    throw error;
  }

  if (!response.ok) {
    await recordDeliveryOutcome(
      {
        category,
        mode,
        status: "failed",
        error: `Provider responded with status ${response.status}.`,
      },
      options,
    );
    throw new Error(`Email delivery failed with status ${response.status}.`);
  }

  await recordDeliveryOutcome({ category, mode, status: "sent" }, options);
}
