import { PgBoss } from "pg-boss";

export const jobQueues = {
  scaffoldProof: "scaffold-proof",
  businessLifecycle: "business-lifecycle",
} as const;

export const defaultQueueOptions = {
  retryLimit: 3,
  retryBackoff: true,
  retentionSeconds: 60 * 60 * 24 * 14,
  deleteAfterSeconds: 60 * 60 * 24 * 7,
} as const;

export function createJobBoss(connectionString: string): PgBoss {
  const boss = new PgBoss({
    connectionString,
    application_name: "ourvalleys-worker",
  });

  boss.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "job_queue_error",
        message: error.message,
      }),
    );
  });

  return boss;
}
