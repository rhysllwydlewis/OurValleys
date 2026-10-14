"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/client";
import { nearestPoints, OUTSIDE_AREA_KM } from "@/lib/map-projection";
import type { HomepageNearPlace } from "@/modules/home/public";
import styles from "./home-live.module.css";

type NearState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "unsupported" | "denied" | "timeout" }
  | {
      status: "found";
      outside: boolean;
      nearest: Array<{ slug: string; distanceKm: number }>;
    };

const RESULT_LIMIT = 3;

/**
 * "Near you": the browser reads the device position and ranks the public
 * place centroids it was given. The position is used only in this function; it
 * is never sent to the server, stored or logged, and nothing happens until the
 * visitor presses the button.
 */
export function NearYou({ places }: { places: HomepageNearPlace[] }) {
  const { t, locale } = useLocale();
  const [state, setState] = useState<NearState>({ status: "idle" });

  const nameFor = (slug: string) => {
    const match = places.find((entry) => entry.slug === slug);
    if (!match) return slug;
    return (locale === "cy" && match.welshName) || match.name;
  };

  function locate() {
    // Not `disabled`: a focused button that disables itself drops keyboard
    // focus, so a repeat press is ignored instead.
    if (state.status === "locating") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestPoints(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          places.map((entry) => ({
            key: entry.slug,
            latitude: entry.latitude,
            longitude: entry.longitude,
          })),
          RESULT_LIMIT,
        );
        if (nearest.length === 0) {
          setState({ status: "unsupported" });
          return;
        }
        setState({
          status: "found",
          outside: nearest[0]!.distanceKm > OUTSIDE_AREA_KM,
          nearest: nearest.map((item) => ({
            slug: item.key,
            distanceKm: item.distanceKm,
          })),
        });
      },
      (error) =>
        setState({
          status: error.code === error.PERMISSION_DENIED ? "denied" : "timeout",
        }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  if (places.length === 0) return null;

  const failureKey =
    state.status === "unsupported"
      ? "homex.nearUnsupported"
      : state.status === "denied"
        ? "homex.nearDenied"
        : state.status === "timeout"
          ? "homex.nearTimeout"
          : null;

  return (
    <section
      className={`${styles.nearYou} ov-glass`}
      aria-labelledby="home-near-title"
      data-home-near
    >
      <div className={styles.nearCopy}>
        <h3 id="home-near-title">{t("homex.nearTitle")}</h3>
        <p>{t("homex.nearLead")}</p>
      </div>
      <div className={styles.nearAction}>
        <button
          type="button"
          className={styles.nearButton}
          onClick={locate}
          aria-disabled={state.status === "locating"}
        >
          {state.status === "locating"
            ? t("homex.nearLocating")
            : state.status === "found"
              ? t("homex.nearAgain")
              : t("homex.nearButton")}
        </button>
        <Link className={styles.nearLink} href="/map">
          {t("homex.viewMap")}
        </Link>
      </div>
      <div className={styles.nearResults} role="status" aria-live="polite">
        {failureKey ? (
          <p className={styles.nearNotice}>{t(failureKey)}</p>
        ) : null}
        {state.status === "found" ? (
          <>
            {state.outside ? (
              <p className={styles.nearNotice}>{t("homex.nearOutside")}</p>
            ) : null}
            <ul aria-label={t("homex.nearResultsLabel")}>
              {state.nearest.map((item) => (
                <li key={item.slug}>
                  <Link href={`/places/${item.slug}`}>
                    <strong>{nameFor(item.slug)}</strong>
                    <span>
                      {t("homex.nearKm", {
                        km:
                          item.distanceKm < 10
                            ? item.distanceKm.toFixed(1)
                            : Math.round(item.distanceKm),
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
