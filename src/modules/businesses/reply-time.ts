import "server-only";
import { and, eq, gte, ne } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessEnquiry } from "@/lib/database/schema/business-operations";
import {
  REPLY_TIME_WINDOW_DAYS,
  replyTimeLabel,
  type EnquiryReplySample,
} from "./reply-time-label";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A short, factual "Usually replies within…" label derived only from real
 * enquiry replies, or null when there is too little data or the business is
 * not responsive enough to say anything positive. Exposes no enquiry content.
 */
export async function getPublicReplyTimeLabel(
  businessId: string,
  now = new Date(),
): Promise<string | null> {
  try {
    const database = getDatabase();
    const since = new Date(now.getTime() - REPLY_TIME_WINDOW_DAYS * DAY_MS);
    const rows = await database
      .select({
        status: businessEnquiry.status,
        submittedAt: businessEnquiry.submittedAt,
        firstRepliedAt: businessEnquiry.firstRepliedAt,
      })
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.businessId, businessId),
          gte(businessEnquiry.submittedAt, since),
          ne(businessEnquiry.status, "spam"),
        ),
      );
    return replyTimeLabel(rows as EnquiryReplySample[], now);
  } catch {
    return null;
  }
}
