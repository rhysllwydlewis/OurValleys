"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Route } from "next";
import type { DirectoryFilters } from "@/modules/businesses/directory-filters";
import {
  nearMeHref,
  resolveNearMe,
  type PlaceCentroid,
} from "@/modules/businesses/near-me";
import styles from "./directory.module.css";

export type NearMeLabels = {
  button: string;
  locating: string;
  /** "Showing businesses near {place}."; the client fills in the place name. */
  found: string;
  denied: string;
  unsupported: string;
  timeout: string;
  outside: string;
};

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "found"; slug: string; place: string }
  | { status: "denied" | "unsupported" | "timeout" | "outside" };

/**
 * "Near me" (doc 101): nothing happens until the visitor presses the button.
 * The device position is used only in this function to pick the nearest public
 * place; only that place's slug goes into the URL, so the position is never
 * sent, stored or logged. The same filter is available without JavaScript
 * through the "Near a place" select.
 */
export function NearMeButton({
  filters,
  centroids,
  displayNames,
  labels,
}: {
  filters: DirectoryFilters;
  centroids: PlaceCentroid[];
  /** Place slug to the name shown in the visitor's language. */
  displayNames: Record<string, string>;
  labels: NearMeLabels;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });

  if (centroids.length === 0) return null;

  function locate() {
    // Not `disabled`: a focused button that disables itself drops keyboard
    // focus, so a repeat press while locating is simply ignored.
    if (state.status === "locating") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result = resolveNearMe(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          centroids,
          filters.near ? filters.radius : undefined,
        );
        if (result.status === "outside") {
          setState({ status: "outside" });
          return;
        }
        if (result.status === "invalid") {
          setState({ status: "unsupported" });
          return;
        }
        const name = displayNames[result.place.slug] ?? result.place.name;
        setState({ status: "found", slug: result.place.slug, place: name });
        router.push(nearMeHref(filters, result) as Route);
      },
      (error) =>
        setState({
          status: error.code === error.PERMISSION_DENIED ? "denied" : "timeout",
        }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  // The confirmation only holds while that place is still the applied filter:
  // removing the "near" chip must not leave a stale "Showing businesses near…".
  const found = state.status === "found" && state.slug === filters.near;
  const message =
    state.status === "found"
      ? found
        ? labels.found.replace("{place}", state.place)
        : ""
      : state.status === "denied"
        ? labels.denied
        : state.status === "unsupported"
          ? labels.unsupported
          : state.status === "timeout"
            ? labels.timeout
            : state.status === "outside"
              ? labels.outside
              : "";

  return (
    <div className={styles.nearMe} data-near-me>
      <button
        type="button"
        className={`button ${styles.nearMeButton}`}
        onClick={locate}
        aria-disabled={state.status === "locating"}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" />
        </svg>
        {state.status === "locating" ? labels.locating : labels.button}
      </button>
      <p
        className={found ? styles.nearMeNote : styles.nearMeProblem}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
