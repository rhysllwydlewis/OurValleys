import { getDatabaseEnvironment } from "../src/lib/env";
import { createJobBoss, createJobQueues } from "../src/lib/jobs/boss";

async function main() {
  const environment = getDatabaseEnvironment();
  const boss = createJobBoss(environment.DATABASE_URL);

  await boss.start();
  await createJobQueues(boss);
  await boss.stop({ graceful: true, timeout: 5_000 });

  console.info(JSON.stringify({ event: "worker_start_check_complete" }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
