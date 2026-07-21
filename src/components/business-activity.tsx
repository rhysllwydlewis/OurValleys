"use client";

import { useEffect } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { BusinessActivityType } from "@/modules/businesses/analytics";

function sendActivity(input: {
  businessId: string;
  eventType: BusinessActivityType;
  source?: string;
}) {
  const body = JSON.stringify(input);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/business-activity",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/business-activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function BusinessPageView({
  businessId,
  source = "direct",
}: {
  businessId: string;
  source?: string;
}) {
  useEffect(() => {
    sendActivity({ businessId, eventType: "website_view", source });
  }, [businessId, source]);
  return null;
}

export function TrackedBusinessLink({
  businessId,
  eventType,
  source,
  children,
  onClick,
  ...anchorProps
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  businessId: string;
  eventType: BusinessActivityType;
  source?: string;
  children: ReactNode;
}) {
  return (
    <a
      {...anchorProps}
      onClick={(event) => {
        sendActivity({ businessId, eventType, source });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
