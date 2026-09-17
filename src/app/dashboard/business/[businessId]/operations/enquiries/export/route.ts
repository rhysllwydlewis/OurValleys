import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  enquiryStatuses,
  formatEnquiriesAsCsv,
  listBusinessEnquiries,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
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
    permission: businessPermissions.manageEnquiries,
  });
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const requestedStatus = new URL(request.url).searchParams.get("status");
  const status = (enquiryStatuses as readonly string[]).includes(
    requestedStatus ?? "",
  )
    ? (requestedStatus as EnquiryStatus)
    : undefined;

  const enquiries = await listBusinessEnquiries(businessId, status, 2000);
  const csv = formatEnquiriesAsCsv(enquiries);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${businessId}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
