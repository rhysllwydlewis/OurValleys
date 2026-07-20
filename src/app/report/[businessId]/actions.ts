"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  reportReasons,
  submitContentReport,
  type SubmitReportResult,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  businessId: z.uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
});

export async function submitBusinessReport(
  input: unknown,
): Promise<SubmitReportResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  let reporterUserId: string | undefined;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    reporterUserId = session?.user.id;
  } catch {
    reporterUserId = undefined;
  }

  return submitContentReport({ ...parsed.data, reporterUserId });
}
