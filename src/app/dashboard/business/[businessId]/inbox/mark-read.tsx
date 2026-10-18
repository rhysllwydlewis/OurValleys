"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markEnquiryReadAction } from "./actions";

/**
 * Marks the open enquiry as read once the pane has been shown. It is a server
 * action (a POST), so prefetching a link can never mark anything read.
 */
export function MarkReadOnOpen({
  businessId,
  enquiryId,
}: {
  businessId: string;
  enquiryId: string;
}) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    void markEnquiryReadAction(businessId, enquiryId)
      .then((result) => {
        if (!cancelled && result === "updated") router.refresh();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [businessId, enquiryId, router]);
  return null;
}
