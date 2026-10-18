import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  getBusinessDailyActivity,
  parseAnalyticsPeriod,
} from "@/modules/businesses/analytics";
import { buildInsightsCsv } from "@/modules/businesses/insights-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success)
    return new Response("Not found", { status: 404 });

  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!canUseBusinessOperationsTools(session.user.email))
    return new Response("Unauthorized", { status: 401 });

  const allowed = await canUserAccessBusiness({
    userId: session.user.id,
    businessId,
    permission: businessPermissions.viewAnalytics,
  });
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const days = parseAnalyticsPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
  );
  const daily = await getBusinessDailyActivity(businessId, days);

  return new Response(buildInsightsCsv(daily), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="insights-${days}-days.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
