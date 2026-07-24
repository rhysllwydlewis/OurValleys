import { spawn } from "node:child_process";
import { getReleaseStage } from "../src/lib/release-stage";

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function main(): Promise<void> {
  const stage = getReleaseStage();
  if (stage === "public") {
    console.info(
      JSON.stringify({
        publicDemoProvisioning: "disabled",
        releaseStage: stage,
        requirement:
          "PUBLIC_DEMOS_REMOVED=true must be independently verified before deployment.",
      }),
    );
    return;
  }

  await run("pnpm", ["auth:provision-demo"]);
}

main().catch((error: unknown) => {
  console.error("Demo access configuration failed.");
  console.error(error instanceof Error ? error.message : "Unknown error.");
  process.exitCode = 1;
});
