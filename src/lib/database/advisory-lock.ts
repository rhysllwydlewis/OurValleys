import "server-only";
import { getDatabaseClient } from "./client";

const localTails = new Map<string, Promise<void>>();

/**
 * Waits for this process's earlier callers of the same lock to finish. Without
 * it, callers that all reserve a connection and then wait on the database lock
 * can use up the whole pool, leaving the caller that holds the lock no
 * connection for its own queries.
 */
async function takeLocalTurn(name: string): Promise<() => void> {
  const previous = localTails.get(name) ?? Promise.resolve();
  let finish = () => {};
  const tail = previous.then(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  localTails.set(name, tail);
  await previous;
  return () => {
    finish();
    if (localTails.get(name) === tail) localTails.delete(name);
  };
}

/**
 * Runs `run` while holding a session-level advisory lock, blocking until the
 * lock is free.
 *
 * Session locks belong to one database connection, and the client pools
 * connections. Locking and unlocking through the pool can therefore use
 * different connections: the unlock then does nothing ("you don't own a lock"),
 * and the lock stays on the first connection, where the next run can wait on
 * it. A reserved connection is used for both calls so the same one releases it.
 *
 * A failed unlock is logged, not thrown: the work has already happened, and a
 * dropped connection releases its session locks anyway.
 */
export async function withSessionAdvisoryLock<T>(
  name: string,
  run: () => Promise<T>,
): Promise<T> {
  const endLocalTurn = await takeLocalTurn(name);
  try {
    const connection = await getDatabaseClient().reserve();
    try {
      await connection`select pg_advisory_lock(hashtext(${name}))`;
      try {
        return await run();
      } finally {
        try {
          await connection`select pg_advisory_unlock(hashtext(${name}))`;
        } catch (error) {
          console.warn(
            JSON.stringify({
              level: "warn",
              event: "advisory_unlock_failed",
              lock: name,
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          );
        }
      }
    } finally {
      connection.release();
    }
  } finally {
    endLocalTurn();
  }
}
