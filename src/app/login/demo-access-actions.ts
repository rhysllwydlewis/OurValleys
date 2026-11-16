"use server";

import type { Route } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { withAuthReturnPath } from "@/lib/auth-return-path";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_MAX_AGE_SECONDS,
  demoAccessToken,
  getDemoAccessMode,
  isDemoCodeCorrect,
} from "@/lib/demo-access";
import { createRateLimiter } from "@/lib/rate-limit";

// Guessing is slowed per visitor and capped overall. The visitor is told
// apart by the forwarded address, as elsewhere in the app, which a determined
// guesser could vary: the overall cap is what bounds guessing, at a rate that
// is hopeless against the owner's own long code. Both limits are per server
// instance. All a correct guess unlocks is seeing the demo accounts.
const perVisitor = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const overall = createRateLimiter({ limit: 60, windowMs: 10 * 60 * 1000 });

function backToSignIn(next: string, outcome: string | null): never {
  const path = withAuthReturnPath("/login", next || undefined);
  if (!outcome) redirect(path as Route);
  const joiner = path.includes("?") ? "&" : "?";
  redirect(`${path}${joiner}demo=${outcome}` as Route);
}

/** Checks a typed demo code and, if right, unlocks this device. */
export async function unlockDemoAccessAction(
  formData: FormData,
): Promise<void> {
  const next = String(formData.get("next") ?? "");
  if (getDemoAccessMode() !== "code") backToSignIn(next, null);

  const requestHeaders = await headers();
  const visitor =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!overall.allow("all") || !perVisitor.allow(visitor)) {
    backToSignIn(next, "wait");
  }

  const submitted = String(formData.get("demoCode") ?? "");
  const token = demoAccessToken();
  if (!token || !isDemoCodeCorrect(submitted)) backToSignIn(next, "wrong");

  (await cookies()).set(DEMO_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_ACCESS_MAX_AGE_SECONDS,
  });
  backToSignIn(next, "unlocked");
}

/** Hides the demo accounts on this device again. */
export async function lockDemoAccessAction(formData: FormData): Promise<void> {
  (await cookies()).delete(DEMO_ACCESS_COOKIE);
  backToSignIn(String(formData.get("next") ?? ""), null);
}
