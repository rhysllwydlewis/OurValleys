"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import {
  setAllSavedBusinessNotify,
  setSavedBusinessNotify,
  type SetNotifyResult,
} from "@/modules/residents/following";

const identifierSchema = z.uuid();

function destination(outcome: SetNotifyResult | "forbidden"): Route {
  return `/account/following?outcome=${outcome}#manage-title` as Route;
}

async function runMutation(
  mutation: (userId: string) => Promise<SetNotifyResult>,
): Promise<never> {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent("/account/following")}` as Route,
    );
  }
  if (
    isPublicDemoEmail(session.user.email) ||
    !identifierSchema.safeParse(session.user.id).success
  ) {
    redirect(destination("forbidden"));
  }
  redirect(destination(await mutation(session.user.id)));
}

/** Turns in-site notices on or off for one business this person saved. */
export async function setBusinessNoticesAction(
  formData: FormData,
): Promise<never> {
  const businessId = identifierSchema.safeParse(
    String(formData.get("businessId") ?? ""),
  );
  const notify = formData.get("notify") === "on";
  return runMutation((userId) =>
    businessId.success
      ? setSavedBusinessNotify(userId, businessId.data, notify)
      : Promise.resolve("invalid" as const),
  );
}

/** Turns notices on or off for every saved business. */
export async function setAllNoticesAction(formData: FormData): Promise<never> {
  const notify = formData.get("notify") === "on";
  return runMutation((userId) => setAllSavedBusinessNotify(userId, notify));
}
