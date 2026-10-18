import "server-only";
import { sendTransactionalEmail, type TransactionalEmail } from "@/lib/email";

type RetryOptions = {
  /** Total tries, including the first. */
  attempts?: number;
  /** Wait before the second try; doubles for each later one. */
  baseDelayMs?: number;
  send?: (message: TransactionalEmail) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Sends with a short bounded retry for a flaky provider call, for messages
 * sent after the primary action has already committed. Returns whether the
 * message went out; it never throws, and the failure log carries no address.
 * A provider that is not configured is not retried.
 */
export async function sendWithRetry(
  message: TransactionalEmail,
  options: RetryOptions = {},
): Promise<boolean> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const send = options.send ?? ((input) => sendTransactionalEmail(input));
  const sleep = options.sleep ?? delay;
  let waitMs = options.baseDelayMs ?? 500;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await send(message);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      const final =
        attempt === attempts || reason === "Email delivery is not configured.";
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
      if (final) return false;
      await sleep(waitMs);
      waitMs *= 2;
    }
  }
  return false;
}
