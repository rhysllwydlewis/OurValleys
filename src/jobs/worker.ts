import { getDatabaseEnvironment } from "@/lib/env";
import { createJobBoss, defaultQueueOptions, jobQueues } from "@/lib/jobs/boss";
import { runLifecycleAutomation } from "@/modules/businesses/lifecycle-automation";

async function main() {
  const environment = getDatabaseEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);

  await boss.start();
  await boss.createQueue(jobQueues.scaffoldProof, defaultQueueOptions);
  await boss.createQueue(jobQueues.businessLifecycle, defaultQueueOptions);

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

  console.info(
    JSON.stringify({ level: "info", event: "worker_ready", queueCount: 2 }),
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
