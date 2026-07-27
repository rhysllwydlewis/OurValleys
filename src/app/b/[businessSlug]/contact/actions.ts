"use server";

import { headers } from "next/headers";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { submitBusinessEnquiry } from "@/modules/businesses/contacts-and-enquiries";
import {
  isAutomatedPublicEnquiry,
  normalisePublicEnquiryInput,
  type PublicEnquiryInput,
} from "./enquiry-input";

export async function submitPublicEnquiry(input: PublicEnquiryInput) {
  const normalisedInput = normalisePublicEnquiryInput(input);
  if (isAutomatedPublicEnquiry(normalisedInput)) {
    return { status: "submitted" } as const;
  }

  const requestHeaders = await headers();
  const visitorHash = hashVisitorSignal(
    [
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
      requestHeaders.get("user-agent"),
    ]
      .filter(Boolean)
      .join("|"),
  );
  return submitBusinessEnquiry({ ...normalisedInput, visitorHash });
}
