/**
 * Release-time retirement of the two privileged public demo identities.
 *
 * The public-release gate refuses to deploy while the business-owner and
 * administrator demo identities exist (`provision-demo-account.ts` checks the
 * database, and the `PRIVILEGED_DEMOS_REMOVED` flag is not accepted in its
 * place). Their passwords are written in the source code, so they cannot stay.
 * Removing them normally means running `pnpm auth:retire-demos --confirm`
 * against production, which not every operator can do. This step lets the
 * release itself do it, and nothing else:
 *
 * - It acts only when the release stage is `public` AND
 *   `RETIRE_PRIVILEGED_DEMOS_ON_RELEASE` is exactly `true`. Every other deploy
 *   (development, private pilot, CI, and a public deploy without the flag) is
 *   a no-op, so it can never remove accounts by accident.
 * - It runs the same `retirePrivilegedDemoAccounts` function as the manual
 *   command: only the two named identities, never the account named by
 *   `ADMIN_EMAIL`, one transaction, with an audit entry.
 * - It runs before `auth:provision-demo`, which then re-verifies that both
 *   identities are absent and fails the release if they are not. The gate is
 *   unchanged; this only does the removal the gate demands.
 *
 * Set the flag for the release that moves the stage to `public`, then remove
 * it. Leaving it set is harmless (a later run finds nothing) but untidy.
 */
import { closeDatabase } from "../src/lib/database/client";
import { getReleaseStage } from "../src/lib/release-stage";
import { retirePrivilegedDemoAccounts } from "./retire-privileged-demo-accounts";

export const retireOnReleaseFlag = "RETIRE_PRIVILEGED_DEMOS_ON_RELEASE";

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

/** True only for the public stage with the flag exactly "true". */
export function shouldRetireOnRelease(
  environment: ReleaseEnvironment = process.env,
): boolean {
  return (
    getReleaseStage(environment.OURVALLEYS_RELEASE_STAGE) === "public" &&
    environment[retireOnReleaseFlag] === "true"
  );
}

async function main(): Promise<void> {
  if (!shouldRetireOnRelease()) {
    console.info(
      `Privileged demo retirement skipped: it runs only at the public stage with ${retireOnReleaseFlag}=true.`,
    );
    return;
  }

  const report = await retirePrivilegedDemoAccounts({
    confirm: true,
    adminEmail: process.env.ADMIN_EMAIL,
  });
  console.info(JSON.stringify(report, null, 2));
  console.info(
    "Retired the privileged demo identities as part of the public release. The release now verifies they are absent.",
  );
}

// Only run when invoked as a script, so the tests can import the function.
if (process.argv[1]?.endsWith("retire-demos-on-release.ts")) {
  main()
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : "Retirement failed.",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDatabase();
    });
}
