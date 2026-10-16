"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { shareOrCopyLink, type ShareOutcome } from "@/lib/share-link";
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
  const container = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Keep the current link inside a horizontally scrolling bar without
    // moving the page itself.
    const link = container.current?.parentElement?.querySelector<HTMLElement>(
      'a[data-active="true"]',
    );
    const bar = link?.parentElement;
    if (!link || !bar || bar.scrollWidth <= bar.clientWidth) return;
    const linkBox = link.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    if (linkBox.left < barBox.left || linkBox.right > barBox.right) {
      bar.scrollLeft +=
        linkBox.left - barBox.left - (barBox.width - linkBox.width) / 2;
    }
  }, [active]);

  return (
    <>
      <span ref={container} hidden />
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
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function share() {
    // The canonical page address only: no hash, and no query string, so a
    // shared link never carries tracking such as `?source=qr`.
    const url = `${window.location.origin}${window.location.pathname}`;
    const result = await shareOrCopyLink(
      {
        share:
          typeof navigator.share === "function"
            ? (data) => navigator.share(data)
            : undefined,
        writeText: navigator.clipboard?.writeText
          ? (text) => navigator.clipboard.writeText(text)
          : undefined,
      },
      { title, url },
    );
    setOutcome(result);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOutcome(null), 4000);
  }

  return (
    <>
      <button type="button" className={className} onClick={share}>
        {children}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {outcome === "copied"
          ? t("site.share.copied")
          : outcome === "unavailable"
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
