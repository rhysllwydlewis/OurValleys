"use client";

import { useEffect } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { BusinessActivityType } from "@/modules/businesses/analytics";
import { classifyTrafficSource } from "@/modules/businesses/traffic-source";
import { takeNavigationSource } from "./navigation-source";

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
  eventType = "website_view",
}: {
  businessId: string;
  source?: string;
  eventType?: BusinessActivityType;
}) {
  useEffect(() => {
    // Only a plain page view is attributed from the referrer; the label is
    // sent, never the referring address.
    // A link followed inside the app leaves the document referrer unchanged,
    // so the page just left is read from the navigation recorder first.
    const from = eventType === "website_view" ? takeNavigationSource() : null;
    const resolved =
      eventType === "website_view" && source === "direct"
        ? classifyTrafficSource({
            referrer: from
              ? `${window.location.origin}${from}`
              : document.referrer,
            ownHost: window.location.host,
          })
        : source;
    sendActivity({ businessId, eventType, source: resolved });
  }, [businessId, eventType, source]);
  return null;
}

export function TrackedBusinessLink({
  businessId,
  eventType,
  source,
  track = true,
  children,
  onClick,
  ...anchorProps
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  businessId: string;
  eventType: BusinessActivityType;
  source?: string;
  /** False in the owner's private preview, so previewing is never counted. */
  track?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      {...anchorProps}
      onClick={(event) => {
        if (track) sendActivity({ businessId, eventType, source });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
