"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuth } from "@/lib/auth";
import {
  resolveBusinessTicket,
  ticketResolutionActions,
  type TicketResolutionAction,
} from "@/modules/businesses/tickets";

export async function resolveTicketAction(formData: FormData) {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session || session.user.role !== "platform_admin") {
    return { status: "forbidden" as const };
  }
  const action = String(formData.get("action") ?? "");
  if (!(ticketResolutionActions as readonly string[]).includes(action)) {
    return { status: "invalid" as const };
  }
  const result = await resolveBusinessTicket({
    adminUserId: session.user.id,
    ticketId: String(formData.get("ticketId") ?? ""),
    action: action as TicketResolutionAction,
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/businesses");
  return result;
}
