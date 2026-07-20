const transientDatabaseCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ENOTFOUND",
  "57P03",
]);

export type DatabaseRetryEvent = {
  attempt: number;
  nextAttempt: number;
  attempts: number;
  delayMs: number;
  code: string;
};

export type DatabaseRetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  onRetry?: (event: DatabaseRetryEvent) => void;
};

type ErrorWithCodeAndCause = Error & {
  code?: string;
  cause?: unknown;
};

export function findDatabaseErrorCode(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  let current = error;

  while (current instanceof Error && !visited.has(current)) {
    visited.add(current);
    const candidate = current as ErrorWithCodeAndCause;
    if (candidate.code) return candidate.code;
    current = candidate.cause;
  }

  return undefined;
}

export function isTransientDatabaseConnectionError(error: unknown): boolean {
  const code = findDatabaseErrorCode(error);
  return code ? transientDatabaseCodes.has(code) : false;
}

async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function retryTransientDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: DatabaseRetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 6);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 1_000);
  const maxDelayMs = Math.max(initialDelayMs, options.maxDelayMs ?? 5_000);
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      const code = findDatabaseErrorCode(error) ?? "UNKNOWN";
      if (attempt === attempts || !isTransientDatabaseConnectionError(error)) {
        throw error;
      }

      const delayMs = Math.min(
        initialDelayMs * 2 ** Math.max(0, attempt - 1),
        maxDelayMs,
      );
      options.onRetry?.({
        attempt,
        nextAttempt: attempt + 1,
        attempts,
        delayMs,
        code,
      });
      await sleep(delayMs);
    }
  }

  throw new Error("Database retry loop ended unexpectedly.");
}
