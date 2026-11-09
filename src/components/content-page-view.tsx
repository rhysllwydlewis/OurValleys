"use client";

import { useEffect } from "react";
import type { ContentKind } from "@/modules/businesses/content-insights-model";
import { classifyTrafficSource } from "@/modules/businesses/traffic-source";
import { takeNavigationSource } from "./navigation-source";

/**
 * Counts one anonymous open of an offer or event page. Only a coarse label of
 * where the visitor came from is sent, never the referring address.
 */
export function ContentPageView({
  kind,
  itemId,
}: {
  kind: ContentKind;
  itemId: string;
}) {
  useEffect(() => {
    const from = takeNavigationSource();
    const source = classifyTrafficSource({
      referrer: from ? `${window.location.origin}${from}` : document.referrer,
      ownHost: window.location.host,
    });
    const body = JSON.stringify({ kind, itemId, source });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/content-view",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/content-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }, [kind, itemId]);
  return null;
}
