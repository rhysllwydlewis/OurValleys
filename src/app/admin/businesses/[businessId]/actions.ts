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
import {
  recordVerificationCheck,
  revokeVerificationCheck,
  type RecordVerificationCheckResult,
  type RevokeVerificationCheckResult,
} from "@/modules/businesses/verification";
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

const recordCheckSchema = z.object({
  businessId: z.uuid(),
  checkType: z.string().min(1).max(40),
  evidenceNote: z.string().trim().min(5).max(1000),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export async function recordVerificationCheckAction(
  input: unknown,
): Promise<RecordVerificationCheckResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = recordCheckSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const expiresAt = parsed.data.expiresOn
    ? new Date(`${parsed.data.expiresOn}T23:59:59.000Z`)
    : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { status: "invalid" };
  }

  const result = await recordVerificationCheck({
    adminUserId: admin.userId,
    businessId: parsed.data.businessId,
    checkType: parsed.data.checkType,
    evidenceNote: parsed.data.evidenceNote,
    expiresAt,
  });
  if (result.status === "recorded") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.verification_recorded",
      targetType: "business",
      targetId: parsed.data.businessId,
      metadata: { checkType: parsed.data.checkType, summary: result.summary },
    });
  }
  return result;
}

export async function revokeVerificationCheckAction(
  input: unknown,
): Promise<RevokeVerificationCheckResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = z
    .object({ checkId: z.uuid(), reason: z.string().trim().min(5).max(500) })
    .safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await revokeVerificationCheck({
    adminUserId: admin.userId,
    checkId: parsed.data.checkId,
    reason: parsed.data.reason,
  });
  if (result.status === "revoked") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.verification_revoked",
      targetType: "business",
      targetId: result.businessId,
      metadata: { reason: parsed.data.reason, summary: result.summary },
    });
  }
  return result;
}
