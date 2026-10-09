import "server-only";
import { getDatabaseClient } from "./client";

/**
 * Runs `run` while holding a session-level advisory lock, blocking until the
 * lock is free.
 *
 * Session locks belong to one database connection, and the client pools
 * connections. Locking and unlocking through the pool can therefore use
 * different connections: the unlock then does nothing ("you don't own a lock"),
 * and the lock stays on the first connection, where the next run can wait on
 * it. A reserved connection is used for both calls so the same one releases it.
 */
export async function withSessionAdvisoryLock<T>(
  name: string,
  run: () => Promise<T>,
): Promise<T> {
  const connection = await getDatabaseClient().reserve();
  try {
    await connection`select pg_advisory_lock(hashtext(${name}))`;
    try {
      return await run();
    } finally {
      await connection`select pg_advisory_unlock(hashtext(${name}))`;
    }
  } finally {
    connection.release();
  }
}
