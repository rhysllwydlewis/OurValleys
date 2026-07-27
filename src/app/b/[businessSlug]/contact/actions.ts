"use server";

import { headers } from "next/headers";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { submitBusinessEnquiry } from "@/modules/businesses/contacts-and-enquiries";
import {
  normalisePublicEnquiryInput,
  type PublicEnquiryInput,
} from "./enquiry-input";

export async function submitPublicEnquiry(input: PublicEnquiryInput) {
  const requestHeaders = await headers();
  const visitorHash = hashVisitorSignal(
    [
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
      requestHeaders.get("user-agent"),
    ]
      .filter(Boolean)
      .join("|"),
  );
  return submitBusinessEnquiry({
    ...normalisePublicEnquiryInput(input),
    visitorHash,
  });
}
