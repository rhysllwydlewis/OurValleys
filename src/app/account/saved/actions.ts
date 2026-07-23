"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import {
  removeBusinessForUser,
  removeEventForUser,
  saveBusinessForUser,
  saveEventForUser,
  type SavedMutationResult,
} from "@/modules/residents/saved-discovery";

const identifierSchema = z.uuid();
const returnPathOrigin = "https://ourvalleys.invalid";
const returnPathSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value.startsWith("/")) return false;

    try {
      return new URL(value, returnPathOrigin).origin === returnPathOrigin;
    } catch {
      return false;
    }
  });

type SavedItemKind = "business" | "event";

async function readResidentActor(): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session || isPublicDemoEmail(session.user.email)) return null;
    return identifierSchema.safeParse(session.user.id).success
      ? session.user.id
      : null;
  } catch {
    return null;
  }
}

function safeReturnPath(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "/account/saved");
  const parsed = returnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : "/account/saved";
}

function returnWithOutcome(
  returnTo: string,
  kind: SavedItemKind,
  outcome: SavedMutationResult | "forbidden",
): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  const destination =
    `${returnTo}${separator}savedKind=${kind}&savedOutcome=${outcome}` as Route;
  redirect(destination);
}

async function runSavedMutation(
  formData: FormData,
  kind: SavedItemKind,
  mutation: (userId: string, itemId: string) => Promise<SavedMutationResult>,
): Promise<never> {
  const returnTo = safeReturnPath(formData);
  const userId = await readResidentActor();
  if (!userId) returnWithOutcome(returnTo, kind, "forbidden");

  const itemId = String(formData.get("itemId") ?? "");
  if (!identifierSchema.safeParse(itemId).success) {
    returnWithOutcome(returnTo, kind, "invalid");
  }

  const outcome = await mutation(userId, itemId);
  returnWithOutcome(returnTo, kind, outcome);
}

export async function saveBusinessAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "business", saveBusinessForUser);
}

export async function removeBusinessAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "business", removeBusinessForUser);
}

export async function saveEventAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "event", saveEventForUser);
}

export async function removeEventAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "event", removeEventForUser);
}
