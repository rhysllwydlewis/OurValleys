"use server";

import { revalidatePath } from "next/cache";
import {
  resolveBusinessTicket,
  ticketResolutionActions,
  type TicketResolutionAction,
} from "@/modules/businesses/tickets";
import { readAdminSession } from "@/modules/identity/admin-access";

export async function resolveTicketAction(formData: FormData) {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" as const };

  const action = String(formData.get("action") ?? "");
  if (!(ticketResolutionActions as readonly string[]).includes(action)) {
    return { status: "invalid" as const };
  }

  const result = await resolveBusinessTicket({
    adminUserId: admin.userId,
    ticketId: String(formData.get("ticketId") ?? ""),
    action: action as TicketResolutionAction,
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/businesses");
  return result;
}
