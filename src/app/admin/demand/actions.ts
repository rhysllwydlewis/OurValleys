"use server";

import { z } from "zod";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { dismissUnmetDemand } from "@/modules/platform/unmet-demand";
import { UNMET_DEMAND_DISMISSAL_STATUSES } from "@/modules/platform/unmet-demand-shared";

const dismissSchema = z.object({
  queryText: z.string().max(80).nullable(),
  categorySlug: z.string().max(120).nullable(),
  placeSlug: z.string().max(120).nullable(),
  status: z.enum(UNMET_DEMAND_DISMISSAL_STATUSES),
});

export async function dismissUnmetDemandAction(
  input: unknown,
): Promise<"dismissed" | "forbidden" | "invalid"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = dismissSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const dismissalId = await dismissUnmetDemand({
    ...parsed.data,
    adminUserId: admin.userId,
  });
  await recordAdminAudit({
    actorUserId: admin.userId,
    action: "unmet_demand.dismissed",
    targetType: "unmet_demand",
    targetId: dismissalId,
    metadata: { status: parsed.data.status },
  });
  return "dismissed";
}
