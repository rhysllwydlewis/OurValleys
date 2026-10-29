"use server";

import { z } from "zod";
import {
  dismissContentReport,
  removeReportedContent,
  resolveContentReport,
  restoreReportedContent,
  type ReportedContentKind,
} from "@/modules/moderation/content-reports";
import { readAdminSession } from "@/modules/identity/admin-access";
import {
  recordAdminAudit,
  type AdminAuditAction,
} from "@/modules/identity/audit-log";

const inputSchema = z.object({
  reportId: z.uuid(),
  note: z.string().trim().max(500).optional(),
});

export type ReportActionResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function resolveReportAction(
  input: unknown,
): Promise<ReportActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await resolveContentReport({
    reportId: parsed.data.reportId,
    adminUserId: admin.userId,
    note: parsed.data.note,
  });
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "content_report.resolved",
      targetType: "content_report",
      targetId: parsed.data.reportId,
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

export async function dismissReportAction(
  input: unknown,
): Promise<ReportActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await dismissContentReport({
    reportId: parsed.data.reportId,
    adminUserId: admin.userId,
    note: parsed.data.note,
  });
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "content_report.dismissed",
      targetType: "content_report",
      targetId: parsed.data.reportId,
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

const auditTargets: Record<
  ReportedContentKind,
  { table: string; removed: AdminAuditAction; restored: AdminAuditAction }
> = {
  event: {
    table: "business_event",
    removed: "event.removed_by_admin",
    restored: "event.restored_by_admin",
  },
  offer: {
    table: "business_offer",
    removed: "offer.removed_by_admin",
    restored: "offer.restored_by_admin",
  },
  update: {
    table: "business_update",
    removed: "update.removed_by_admin",
    restored: "update.restored_by_admin",
  },
};

async function removeReported(
  kind: ReportedContentKind,
  input: unknown,
): Promise<ReportActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await removeReportedContent({
    kind,
    reportId: parsed.data.reportId,
    adminUserId: admin.userId,
    note: parsed.data.note,
  });
  if (result.status === "removed") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: auditTargets[kind].removed,
      targetType: auditTargets[kind].table,
      targetId: result.targetId,
      metadata: { reportId: parsed.data.reportId },
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

async function restoreReported(
  kind: ReportedContentKind,
  input: unknown,
): Promise<ReportActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await restoreReportedContent({
    kind,
    reportId: parsed.data.reportId,
  });
  if (result.status === "restored") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: auditTargets[kind].restored,
      targetType: auditTargets[kind].table,
      targetId: result.targetId,
      metadata: { reportId: parsed.data.reportId },
    });
    return { status: "ok" };
  }
  return result.status === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

export async function removeReportedEventAction(input: unknown) {
  return removeReported("event", input);
}

export async function removeReportedOfferAction(input: unknown) {
  return removeReported("offer", input);
}

export async function removeReportedUpdateAction(input: unknown) {
  return removeReported("update", input);
}

export async function restoreReportedEventAction(input: unknown) {
  return restoreReported("event", input);
}

export async function restoreReportedOfferAction(input: unknown) {
  return restoreReported("offer", input);
}

export async function restoreReportedUpdateAction(input: unknown) {
  return restoreReported("update", input);
}
