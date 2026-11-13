"use client";

import { useEffect } from "react";
import type { EditorialKind } from "@/modules/platform/editorial-insights-model";
import { classifyTrafficSource } from "@/modules/businesses/traffic-source";
import { takeNavigationSource } from "./navigation-source";

/**
 * Counts one anonymous open of a place, guide or local story page. Only a
 * coarse label of where the visitor came from is sent, never the referring
 * address.
 */
export function EditorialPageView({
  kind,
  itemId,
}: {
  kind: EditorialKind;
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
        "/api/editorial-view",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/editorial-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }, [kind, itemId]);
  return null;
}
