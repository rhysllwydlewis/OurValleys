"use server";

import { z } from "zod";
import {
  dismissContentReport,
  resolveContentReport,
} from "@/modules/moderation/content-reports";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

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
