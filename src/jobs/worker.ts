import { getServerEnvironment } from "@/lib/env";
import { createJobBoss, defaultQueueOptions, jobQueues } from "@/lib/jobs/boss";

async function main() {
  const environment = getServerEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);
  await boss.start();

  for (const queue of Object.values(jobQueues)) {
    await boss.createQueue(queue, defaultQueueOptions);
  }

  await boss.work(jobQueues.searchProjection, async ([job]) => {
    console.info(JSON.stringify({ level: "info", event: "search_projection_job_received", jobId: job.id, businessId: job.data }));
  });

  const shutdown = async () => {
    await boss.stop({ graceful: true, timeout: 15_000 });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(JSON.stringify({ level: "error", event: "worker_start_failed", message }));
  process.exit(1);
});
