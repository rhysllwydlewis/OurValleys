import { PgBoss } from "pg-boss";

export const jobQueues = {
  scaffoldProof: "scaffold-proof",
  businessLifecycle: "business-lifecycle",
  enquiryRetention: "enquiry-retention",
  platformRetention: "platform-retention",
  placeDigest: "place-digest",
  ownerDigest: "owner-digest",
  eventReminders: "event-reminders",
  savedSearchAlerts: "saved-search-alerts",
  storageCleanup: "storage-cleanup",
  followedNotices: "followed-notices",
  scheduledUpdates: "scheduled-updates",
  scheduledStories: "scheduled-stories",
} as const;

export const defaultQueueOptions = {
  retryLimit: 3,
  retryBackoff: true,
  retentionSeconds: 60 * 60 * 24 * 14,
  deleteAfterSeconds: 60 * 60 * 24 * 7,
} as const;

/**
 * Creates every queue in `jobQueues`. pg-boss refuses `work` and `schedule` on a
 * queue that does not exist, so the worker and its start check both call this
 * instead of keeping their own lists, which drift apart when a queue is added.
 */
export async function createJobQueues(boss: PgBoss): Promise<void> {
  for (const name of Object.values(jobQueues)) {
    await boss.createQueue(name, defaultQueueOptions);
  }
}

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
