import { getDatabaseEnvironment } from "@/lib/env";
import { createJobBoss, defaultQueueOptions, jobQueues } from "@/lib/jobs/boss";
import { purgeExpiredBusinessEnquiries } from "@/modules/businesses/contacts-and-enquiries";
import { runLifecycleAutomation } from "@/modules/businesses/lifecycle-automation";
import { purgePlatformData } from "@/modules/platform/data-retention";
import { runPlaceDigest } from "@/modules/residents/place-digest";

async function main() {
  const environment = getDatabaseEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);

  await boss.start();
  await boss.createQueue(jobQueues.scaffoldProof, defaultQueueOptions);
  await boss.createQueue(jobQueues.businessLifecycle, defaultQueueOptions);
  await boss.createQueue(jobQueues.enquiryRetention, defaultQueueOptions);
  await boss.createQueue(jobQueues.platformRetention, defaultQueueOptions);
  await boss.createQueue(jobQueues.placeDigest, defaultQueueOptions);

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

  await boss.work(jobQueues.businessLifecycle, async () => {
    const result = await runLifecycleAutomation();
    console.info(
      JSON.stringify({
        level: "info",
        event: "business_lifecycle_automation_complete",
        ...result,
      }),
    );
  });
  await boss.schedule(jobQueues.businessLifecycle, "*/15 * * * *", {});

  await boss.work(jobQueues.enquiryRetention, async () => {
    const result = await purgeExpiredBusinessEnquiries();
    console.info(
      JSON.stringify({
        level: "info",
        event: "enquiry_retention_complete",
        ...result,
      }),
    );
  });
  await boss.schedule(jobQueues.enquiryRetention, "0 3 * * *", {});

  await boss.work(jobQueues.platformRetention, async () => {
    const result = await purgePlatformData();
    console.info(
      JSON.stringify({
        level: "info",
        event: "platform_retention_complete",
        ...result,
      }),
    );
  });
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

  console.info(
    JSON.stringify({ level: "info", event: "worker_ready", queueCount: 5 }),
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
