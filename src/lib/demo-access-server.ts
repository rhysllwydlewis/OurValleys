import "server-only";
import { cookies } from "next/headers";
import {
  DEMO_ACCESS_COOKIE,
  areDemosShown,
  getDemoAccessMode,
  type DemoAccessMode,
} from "./demo-access";

/**
 * What this request may see of the shared demo accounts: the mode the owner
 * has configured, and whether this visitor's device has been unlocked.
 */
export async function readDemoAccess(): Promise<{
  mode: DemoAccessMode;
  shown: boolean;
}> {
  const mode = getDemoAccessMode();
  if (mode !== "code") return { mode, shown: mode === "open" };
  const cookie = (await cookies()).get(DEMO_ACCESS_COOKIE)?.value;
  return { mode, shown: areDemosShown(cookie) };
}
