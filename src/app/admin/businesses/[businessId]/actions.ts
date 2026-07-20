"use server";

import { z } from "zod";
import {
  approveBusinessPublication,
  rejectBusinessPublication,
  reinstateBusiness,
  suspendBusiness,
  type ApprovePublicationResult,
  type ReinstateBusinessResult,
  type RejectPublicationResult,
  type SuspendBusinessResult,
} from "@/modules/businesses/publication";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

const businessIdSchema = z.object({ businessId: z.uuid() });
const noteSchema = z.object({
  businessId: z.uuid(),
  note: z.string().trim().min(5).max(500),
});

export async function approveAction(
  input: unknown,
): Promise<ApprovePublicationResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = businessIdSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  const result = await approveBusinessPublication({
    adminUserId: admin.userId,
    businessId: parsed.data.businessId,
  });
  if (result.status === "approved") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.publication_approved",
      targetType: "business",
      targetId: parsed.data.businessId,
    });
  }
  return result;
}

export async function rejectAction(
  input: unknown,
): Promise<RejectPublicationResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  const result = await rejectBusinessPublication({
    adminUserId: admin.userId,
    businessId: parsed.data.businessId,
    note: parsed.data.note,
  });
  if (result.status === "rejected") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.publication_rejected",
      targetType: "business",
      targetId: parsed.data.businessId,
      metadata: { note: parsed.data.note },
    });
  }
  return result;
}

export async function suspendAction(
  input: unknown,
): Promise<SuspendBusinessResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  const result = await suspendBusiness({
    adminUserId: admin.userId,
    businessId: parsed.data.businessId,
    reason: parsed.data.note,
  });
  if (result.status === "suspended") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.suspended",
      targetType: "business",
      targetId: parsed.data.businessId,
      metadata: { reason: parsed.data.note },
    });
  }
  return result;
}

export async function reinstateAction(
  input: unknown,
): Promise<ReinstateBusinessResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = businessIdSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  const result = await reinstateBusiness({
    businessId: parsed.data.businessId,
  });
  if (result.status === "reinstated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.reinstated",
      targetType: "business",
      targetId: parsed.data.businessId,
    });
  }
  return result;
}
