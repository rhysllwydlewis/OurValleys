import { getServerEnvironment } from "@/lib/env";
import { createJobBoss, defaultQueueOptions, jobQueues } from "@/lib/jobs/boss";

async function main() {
  const environment = getServerEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);

  await boss.start();
  await boss.createQueue(jobQueues.scaffoldProof, defaultQueueOptions);
  await boss.work(jobQueues.scaffoldProof, async ([job]) => {
    console.info(
      JSON.stringify({
        level: "info",
        event: "scaffold_proof_job_received",
        jobId: job.id,
      }),
    );
  });

  console.info(
    JSON.stringify({ level: "info", event: "worker_ready", queueCount: 1 }),
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
