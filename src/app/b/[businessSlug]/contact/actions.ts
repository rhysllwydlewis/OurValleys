"use server";

import { headers } from "next/headers";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { submitBusinessEnquiry } from "@/modules/businesses/contacts-and-enquiries";

export async function submitPublicEnquiry(input: {
  businessId: string;
  kind: "enquiry" | "quote" | "callback";
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  preferredTime?: string;
  consentAccepted: boolean;
  website?: string;
}) {
  const requestHeaders = await headers();
  const visitorHash = hashVisitorSignal(
    [
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
      requestHeaders.get("user-agent"),
    ]
      .filter(Boolean)
      .join("|"),
  );
  return submitBusinessEnquiry({ ...input, visitorHash });
}
