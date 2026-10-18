import "server-only";
import {
  EmailDeliveryError,
  sendTransactionalEmail,
  type EmailDeliveryOutcome,
  type TransactionalEmail,
} from "@/lib/email";

type RetryOptions = {
  /** Total tries, including the first. */
  attempts?: number;
  /** Wait before the second try; doubles for each later one. */
  baseDelayMs?: number;
  send?: (
    message: TransactionalEmail,
    options: {
      recordOutcome: (outcome: EmailDeliveryOutcome) => Promise<void>;
    },
  ) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  /** Receives the one final outcome of the whole operation (tests). */
  recordFinal?: (outcome: EmailDeliveryOutcome) => Promise<void>;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Transport failures, timeouts, rate limits and server errors can recover; other rejections cannot. */
function isRecoverable(error: unknown): boolean {
  if (error instanceof EmailDeliveryError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return !(
    error instanceof Error &&
    error.message === "Email delivery is not configured."
  );
}

async function recordFinalOutcome(
  outcome: EmailDeliveryOutcome | null,
  options: RetryOptions,
): Promise<void> {
  if (!outcome) return;
  try {
    if (options.recordFinal) {
      await options.recordFinal(outcome);
      return;
    }
    const { recordEmailDelivery } =
      await import("@/modules/platform/email-delivery-log");
    await recordEmailDelivery(outcome);
  } catch {
    // A logging failure never changes whether the email went out.
  }
}

/**
 * Sends with a short bounded retry for a flaky provider call, for messages
 * sent after the primary action has already committed. Returns whether the
 * message went out; it never throws, and the failure log carries no address.
 * Only recoverable failures are retried, the message should carry an
 * `idempotencyKey` so a lost response cannot deliver it twice, and the
 * delivery log records one outcome for the whole operation, not one per try.
 */
export async function sendWithRetry(
  message: TransactionalEmail,
  options: RetryOptions = {},
): Promise<boolean> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const send =
    options.send ??
    ((input, sendOptions) => sendTransactionalEmail(input, sendOptions));
  const sleep = options.sleep ?? delay;
  let waitMs = options.baseDelayMs ?? 500;
  let lastOutcome: EmailDeliveryOutcome | null = null;
  const capture = async (outcome: EmailDeliveryOutcome) => {
    lastOutcome = outcome;
  };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await send(message, { recordOutcome: capture });
      await recordFinalOutcome(lastOutcome, options);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      const final = attempt === attempts || !isRecoverable(error);
      console.error(
        JSON.stringify({
          level: "error",
          event: "transactional_email_failed",
          category: message.category ?? "other",
          attempt,
          willRetry: !final,
          message: reason,
        }),
      );
      if (final) {
        await recordFinalOutcome(lastOutcome, options);
        return false;
      }
      await sleep(waitMs);
      waitMs *= 2;
    }
  }
  return false;
}
