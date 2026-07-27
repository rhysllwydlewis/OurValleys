"use server";

import { headers } from "next/headers";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import { submitBusinessEnquiry } from "@/modules/businesses/contacts-and-enquiries";
import {
  isAutomatedPublicEnquiry,
  normalisePublicEnquiryInput,
} from "./enquiry-input";

export async function submitPublicEnquiry(input: unknown) {
  const normalisedInput = normalisePublicEnquiryInput(input);
  if (!normalisedInput) {
    return {
      status: "invalid",
      message: "Check the form and try again.",
    } as const;
  }
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
