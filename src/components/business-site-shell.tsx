"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import styles from "./generated-business-website.module.css";

/**
 * Client-side parts of the generated business website shell (docs/32 §6.2,
 * WP-07): navigation that shows where the visitor is, and a sticky action bar
 * for phones. Both work without script as plain links.
 */

export type ShellSection = { id: string; label: string };

/** Pure: which section is "current" given each section's distance from the top. */
export function pickActiveSection(
  offsets: Array<{ id: string; top: number }>,
  threshold: number,
): string | null {
  let active: string | null = null;
  for (const entry of offsets) {
    if (entry.top <= threshold) active = entry.id;
  }
  return active;
}

function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (list.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const offsets = list.flatMap((id) => {
        const element = document.getElementById(id);
        return element
          ? [{ id, top: element.getBoundingClientRect().top }]
          : [];
      });
      setActive(pickActiveSection(offsets, window.innerHeight * 0.3));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}

export function SectionNavLinks({ sections }: { sections: ShellSection[] }) {
  const active = useActiveSection(sections.map((section) => section.id));
  return (
    <>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "location" : undefined}
          data-active={active === section.id ? "true" : undefined}
        >
          {section.label}
        </a>
      ))}
    </>
  );
}

type ShareState = "idle" | "copied" | "failed";

export function ShareButton({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [state, setState] = useState<ShareState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function share() {
    const url = window.location.href.split("#")[0] ?? window.location.href;
    let next: ShareState = "idle";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        next = "copied";
      }
    } catch (error) {
      // Dismissing the system share sheet is not an error worth announcing.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        next = "failed";
      }
    }
    setState(next);
    if (timer.current) window.clearTimeout(timer.current);
    if (next !== "idle") {
      timer.current = window.setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={share}>
        {children}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied"
          ? t("site.share.copied")
          : state === "failed"
            ? t("site.share.failed")
            : ""}
      </span>
    </>
  );
}

export function MobileActionBar({
  phoneHref,
  primaryAction,
  title,
}: {
  phoneHref: string | null;
  primaryAction: { href: string; label: string } | null;
  title: string;
}) {
  const t = useT();
  // A primary action that already dials the phone must not appear twice.
  const showPhone =
    phoneHref !== null &&
    !(primaryAction && primaryAction.href.startsWith("tel:"));
  const primary = primaryAction;

  return (
    <nav
      className={styles.actionBar}
      aria-label={t("site.quickActions")}
      data-print="hide"
    >
      {showPhone ? (
        <a className={styles.actionBarLink} href={phoneHref!}>
          {t("site.callUs")}
        </a>
      ) : null}
      {primary ? (
        <a
          className={`${styles.actionBarLink} ${styles.actionBarPrimary}`}
          href={primary.href}
        >
          {primary.label}
        </a>
      ) : null}
      <ShareButton title={title} className={styles.actionBarLink}>
        {t("site.share")}
      </ShareButton>
    </nav>
  );
}
