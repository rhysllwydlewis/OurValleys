import { getDatabaseEnvironment } from "@/lib/env";
import { createJobBoss, defaultQueueOptions, jobQueues } from "@/lib/jobs/boss";
import { purgeExpiredBusinessEnquiries } from "@/modules/businesses/contacts-and-enquiries";
import { runLifecycleAutomation } from "@/modules/businesses/lifecycle-automation";
import { expireVerificationChecks } from "@/modules/businesses/verification";
import { purgePlatformData } from "@/modules/platform/data-retention";
import { runEventReminders } from "@/modules/residents/event-reminders";
import { runPlaceDigest } from "@/modules/residents/place-digest";

/**
 * Logs a job failure at error level and rethrows so pg-boss records the run as
 * failed and retries it, instead of the failure reading as a quiet day.
 */
function failLoudly<T>(
  event: string,
  handler: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event,
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      throw error;
    }
  };
}

async function main() {
  const environment = getDatabaseEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);

  await boss.start();
  await boss.createQueue(jobQueues.scaffoldProof, defaultQueueOptions);
  await boss.createQueue(jobQueues.businessLifecycle, defaultQueueOptions);
  await boss.createQueue(jobQueues.enquiryRetention, defaultQueueOptions);
  await boss.createQueue(jobQueues.platformRetention, defaultQueueOptions);
  await boss.createQueue(jobQueues.placeDigest, defaultQueueOptions);
  await boss.createQueue(jobQueues.eventReminders, defaultQueueOptions);

  await boss.work(jobQueues.scaffoldProof, async ([job]) => {
    if (!job) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "scaffold_proof_job_missing",
        }),
      );
      return;
    }

    console.info(
      JSON.stringify({
        level: "info",
        event: "scaffold_proof_job_received",
        jobId: job.id,
      }),
    );
  });

  await boss.work(
    jobQueues.businessLifecycle,
    failLoudly("business_lifecycle_automation_failed", async () => {
      const result = await runLifecycleAutomation();
      const verification = await expireVerificationChecks();
      console.info(
        JSON.stringify({
          level: "info",
          event: "business_lifecycle_automation_complete",
          ...result,
          verificationDowngraded: verification.downgraded,
        }),
      );
    }),
  );
  await boss.schedule(jobQueues.businessLifecycle, "*/15 * * * *", {});

  await boss.work(
    jobQueues.enquiryRetention,
    failLoudly("enquiry_retention_failed", async () => {
      const result = await purgeExpiredBusinessEnquiries();
      console.info(
        JSON.stringify({
          level: "info",
          event: "enquiry_retention_complete",
          ...result,
        }),
      );
    }),
  );
  await boss.schedule(jobQueues.enquiryRetention, "0 3 * * *", {});

  await boss.work(
    jobQueues.platformRetention,
    failLoudly("platform_retention_failed", async () => {
      const result = await purgePlatformData();
      if (result.failures.length > 0) {
        throw new Error(
          `platform retention purges failed: ${result.failures.join(", ")}`,
        );
      }
      console.info(
        JSON.stringify({
          level: "info",
          event: "platform_retention_complete",
          ...result,
        }),
      );
    }),
  );
  await boss.schedule(jobQueues.platformRetention, "30 3 * * *", {});

  await boss.work(jobQueues.placeDigest, async () => {
    const result = await runPlaceDigest();
    console.info(
      JSON.stringify({
        level: "info",
        event: "place_digest_complete",
        ...result,
      }),
    );
  });
  await boss.schedule(jobQueues.placeDigest, "0 9 * * 1", {});

  await boss.work(jobQueues.eventReminders, async () => {
    const result = await runEventReminders();
    console.info(
      JSON.stringify({
        level: "info",
        event: "event_reminders_complete",
        ...result,
      }),
    );
  });
  await boss.schedule(jobQueues.eventReminders, "0 8 * * *", {});

  console.info(
    JSON.stringify({ level: "info", event: "worker_ready", queueCount: 6 }),
  );

  const shutdown = async () => {
    await boss.stop({ graceful: true, timeout: 15_000 });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(
    JSON.stringify({ level: "error", event: "worker_start_failed", message }),
  );
  process.exit(1);
});
