"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { readEnabledKinds } from "@/modules/residents/notice-preferences-model";
import { saveNoticePreferences } from "@/modules/residents/notice-preferences";

const identifierSchema = z.uuid();

function destination(outcome: string): Route {
  return `/account/privacy?outcome=${outcome}#notices` as Route;
}

/** Saves which in-site notices the signed-in person wants to receive. */
export async function saveNoticePreferencesAction(
  formData: FormData,
): Promise<never> {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent("/account/privacy")}` as Route);
  }
  if (
    isPublicDemoEmail(session.user.email) ||
    !identifierSchema.safeParse(session.user.id).success
  ) {
    redirect(destination("forbidden"));
  }
  const enabled = readEnabledKinds(formData.getAll("kind"));
  const result = await saveNoticePreferences(session.user.id, enabled);
  redirect(destination(result));
}
