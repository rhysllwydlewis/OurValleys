import { describe, expect, it, vi } from "vitest";
import {
  findDatabaseErrorCode,
  isTransientDatabaseConnectionError,
  retryTransientDatabaseOperation,
} from "../../src/lib/database/connection-retry";

function errorWithCode(code: string, cause?: unknown): Error {
  return Object.assign(new Error(`database error ${code}`), { code, cause });
}

describe("database connection retry", () => {
  it("finds a nested connection error code", () => {
    const error = new Error("migration failed", {
      cause: errorWithCode("ECONNREFUSED"),
    });

    expect(findDatabaseErrorCode(error)).toBe("ECONNREFUSED");
    expect(isTransientDatabaseConnectionError(error)).toBe(true);
  });

  it.each(["ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"])(
    "retries transient %s failures and then succeeds",
    async (code) => {
      const operation = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(errorWithCode(code))
        .mockResolvedValue("connected");
      const sleep = vi.fn(async () => undefined);
      const onRetry = vi.fn();

      await expect(
        retryTransientDatabaseOperation(operation, {
          attempts: 3,
          initialDelayMs: 100,
          sleep,
          onRetry,
        }),
      ).resolves.toBe("connected");

      expect(operation).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(100);
      expect(onRetry).toHaveBeenCalledWith({
        attempt: 1,
        nextAttempt: 2,
        attempts: 3,
        delayMs: 100,
        code,
      });
    },
  );

  it("uses bounded exponential delays", async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(errorWithCode("ECONNREFUSED"))
      .mockRejectedValueOnce(errorWithCode("ECONNREFUSED"))
      .mockRejectedValueOnce(errorWithCode("ECONNREFUSED"))
      .mockResolvedValue(undefined);
    const sleep = vi.fn(async () => undefined);

    await retryTransientDatabaseOperation(operation, {
      attempts: 4,
      initialDelayMs: 200,
      maxDelayMs: 500,
      sleep,
    });

    expect(sleep.mock.calls).toEqual([[200], [400], [500]]);
  });

  it("does not retry authentication or migration failures", async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(errorWithCode("28P01"));
    const sleep = vi.fn(async () => undefined);

    await expect(
      retryTransientDatabaseOperation(operation, { sleep }),
    ).rejects.toThrow("28P01");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops after the configured number of attempts", async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(errorWithCode("ECONNREFUSED"));
    const sleep = vi.fn(async () => undefined);

    await expect(
      retryTransientDatabaseOperation(operation, {
        attempts: 3,
        initialDelayMs: 0,
        sleep,
      }),
    ).rejects.toThrow("ECONNREFUSED");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
