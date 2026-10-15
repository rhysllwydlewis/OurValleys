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
  removePlaceForUser,
  saveBusinessForUser,
  saveEventForUser,
  savePlaceForUser,
  type SavedMutationResult,
} from "@/modules/residents/saved-discovery";
import {
  openSavedSearchForUser,
  removeSavedSearchForUser,
  saveSearchForUser,
  type SavedSearchMutationResult,
} from "@/modules/residents/saved-searches";

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

type SavedItemKind = "business" | "event" | "place" | "search";
type ResidentActor =
  | { state: "ready"; userId: string }
  | { state: "anonymous" }
  | { state: "forbidden" };

async function readResidentActor(): Promise<ResidentActor> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return { state: "anonymous" };
    if (isPublicDemoEmail(session.user.email)) return { state: "forbidden" };
    return identifierSchema.safeParse(session.user.id).success
      ? { state: "ready", userId: session.user.id }
      : { state: "forbidden" };
  } catch {
    return { state: "forbidden" };
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
  outcome: SavedMutationResult | SavedSearchMutationResult | "forbidden",
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
  const actor = await readResidentActor();
  if (actor.state === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(returnTo)}` as Route);
  }
  if (actor.state === "forbidden") {
    returnWithOutcome(returnTo, kind, "forbidden");
  }

  const itemId = String(formData.get("itemId") ?? "");
  if (!identifierSchema.safeParse(itemId).success) {
    returnWithOutcome(returnTo, kind, "invalid");
  }

  const outcome = await mutation(actor.userId, itemId);
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

export async function savePlaceAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "place", savePlaceForUser);
}

export async function removePlaceAction(formData: FormData): Promise<never> {
  return runSavedMutation(formData, "place", removePlaceForUser);
}

async function readSearchActor(returnTo: string) {
  const actor = await readResidentActor();
  if (actor.state === "anonymous") {
    redirect(`/login?next=${encodeURIComponent(returnTo)}` as Route);
  }
  if (actor.state === "forbidden") {
    returnWithOutcome(returnTo, "search", "forbidden");
  }
  return actor;
}

export async function saveSearchAction(formData: FormData): Promise<never> {
  const returnTo = safeReturnPath(formData);
  const actor = await readSearchActor(returnTo);
  const outcome = await saveSearchForUser(
    actor.userId,
    formData.get("query"),
    formData.get("type"),
  );
  returnWithOutcome(returnTo, "search", outcome);
}

export async function removeSearchAction(formData: FormData): Promise<never> {
  const returnTo = safeReturnPath(formData);
  const actor = await readSearchActor(returnTo);
  const outcome = await removeSavedSearchForUser(
    actor.userId,
    String(formData.get("itemId") ?? ""),
  );
  returnWithOutcome(returnTo, "search", outcome);
}

/** Marks the search as looked at, then opens it. */
export async function openSearchAction(formData: FormData): Promise<never> {
  const returnTo = safeReturnPath(formData);
  const actor = await readSearchActor(returnTo);
  const href = await openSavedSearchForUser(
    actor.userId,
    String(formData.get("itemId") ?? ""),
  );
  if (!href) returnWithOutcome(returnTo, "search", "not_found");
  redirect(href as Route);
}
