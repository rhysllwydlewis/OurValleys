import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  savedBusiness,
  savedEvent,
} from "@/lib/database/schema/saved-discovery";

const identifierSchema = z.uuid();

export type SavedMutationResult =
  | "saved"
  | "already_saved"
  | "removed"
  | "not_found"
  | "invalid"
  | "unavailable";

function parseIdentifiers(userId: string, itemId: string) {
  const parsedUserId = identifierSchema.safeParse(userId);
  const parsedItemId = identifierSchema.safeParse(itemId);
  if (!parsedUserId.success || !parsedItemId.success) return null;
  return { userId: parsedUserId.data, itemId: parsedItemId.data };
}

export async function saveBusinessForUser(
  userId: string,
  businessId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, businessId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .insert(savedBusiness)
      .values({ userId: identifiers.userId, businessId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ businessId: savedBusiness.businessId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removeBusinessForUser(
  userId: string,
  businessId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, businessId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedBusiness)
      .where(
        and(
          eq(savedBusiness.userId, identifiers.userId),
          eq(savedBusiness.businessId, identifiers.itemId),
        ),
      )
      .returning({ businessId: savedBusiness.businessId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function saveEventForUser(
  userId: string,
  eventId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, eventId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .insert(savedEvent)
      .values({ userId: identifiers.userId, eventId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ eventId: savedEvent.eventId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removeEventForUser(
  userId: string,
  eventId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, eventId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedEvent)
      .where(
        and(
          eq(savedEvent.userId, identifiers.userId),
          eq(savedEvent.eventId, identifiers.itemId),
        ),
      )
      .returning({ eventId: savedEvent.eventId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listSavedBusinessIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ businessId: savedBusiness.businessId })
      .from(savedBusiness)
      .where(eq(savedBusiness.userId, parsedUserId.data))
      .orderBy(desc(savedBusiness.createdAt));
    return rows.map((row) => row.businessId);
  } catch {
    return [];
  }
}

export async function listSavedEventIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ eventId: savedEvent.eventId })
      .from(savedEvent)
      .where(eq(savedEvent.userId, parsedUserId.data))
      .orderBy(desc(savedEvent.createdAt));
    return rows.map((row) => row.eventId);
  } catch {
    return [];
  }
}
