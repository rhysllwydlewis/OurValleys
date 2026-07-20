"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  isMembershipStatus,
  removeMembership,
  setMembershipStatus,
} from "@/modules/identity/admin-users";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export type UserActionResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "unavailable" };

const setRoleInputSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["user", "admin"]),
});

export async function setUserRoleAction(
  input: unknown,
): Promise<UserActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = setRoleInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  try {
    await getAuth().api.setRole({
      body: { userId: parsed.data.userId, role: parsed.data.role },
      headers: await headers(),
    });
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "user.role_changed",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: { role: parsed.data.role },
    });
    return { status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

const banInputSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(5).max(300),
});

export async function banUserAction(input: unknown): Promise<UserActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = banInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  if (parsed.data.userId === admin.userId) return { status: "invalid" };

  try {
    await getAuth().api.banUser({
      body: { userId: parsed.data.userId, banReason: parsed.data.reason },
      headers: await headers(),
    });
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "user.banned",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: { reason: parsed.data.reason },
    });
    return { status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

const userIdInputSchema = z.object({ userId: z.uuid() });

export async function unbanUserAction(
  input: unknown,
): Promise<UserActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = userIdInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  try {
    await getAuth().api.unbanUser({
      body: { userId: parsed.data.userId },
      headers: await headers(),
    });
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "user.unbanned",
      targetType: "user",
      targetId: parsed.data.userId,
    });
    return { status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

const membershipStatusInputSchema = z.object({
  membershipId: z.uuid(),
  status: z.string(),
});

export async function setMembershipStatusAction(
  input: unknown,
): Promise<UserActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = membershipStatusInputSchema.safeParse(input);
  if (!parsed.success || !isMembershipStatus(parsed.data.status)) {
    return { status: "invalid" };
  }

  const result = await setMembershipStatus({
    membershipId: parsed.data.membershipId,
    status: parsed.data.status,
  });
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "membership.status_changed",
      targetType: "business_membership",
      targetId: parsed.data.membershipId,
      metadata: { status: parsed.data.status },
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

export async function removeMembershipAction(
  input: unknown,
): Promise<UserActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = z.object({ membershipId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await removeMembership({
    membershipId: parsed.data.membershipId,
  });
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "membership.removed",
      targetType: "business_membership",
      targetId: parsed.data.membershipId,
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}
