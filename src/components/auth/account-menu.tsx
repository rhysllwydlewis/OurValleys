"use client";

import type { CSSProperties } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authClient } from "@/lib/auth-client";
import styles from "./account-menu.module.css";
import { useSignOut } from "./use-sign-out";

type AccountMenuProps = {
  triggerClassName: string | undefined;
};

type PanelStyle = Pick<
  CSSProperties,
  "top" | "bottom" | "left" | "width" | "maxHeight"
>;

/**
 * Renders nothing when signed out — callers already have their own signed-out
 * affordance (a plain sign-in link, or the homepage's inline sign-in dialog
 * trigger) and shouldn't lose that by delegating to a shared default here.
 */
export function AccountMenu({ triggerClassName }: AccountMenuProps) {
  const { data: session } = authClient.useSession();
  const { signOut, isSigningOut, errorMessage } = useSignOut();
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<PanelStyle>();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const positionPanel = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const triggerBounds = trigger.getBoundingClientRect();
    const gutter = 12;
    const gap = 10;
    const preferredPanelHeight = 190;
    const availableWidth = Math.max(0, window.innerWidth - gutter * 2);
    const width = Math.min(224, availableWidth);
    const left = Math.min(
      Math.max(gutter, triggerBounds.right - width),
      window.innerWidth - width - gutter,
    );
    const availableBelow = Math.max(
      0,
      window.innerHeight - triggerBounds.bottom - gap - gutter,
    );
    const availableAbove = Math.max(0, triggerBounds.top - gap - gutter);
    const openAbove =
      availableBelow < preferredPanelHeight && availableAbove > availableBelow;
    const availableHeight = openAbove ? availableAbove : availableBelow;

    setPanelStyle({
      top: openAbove ? undefined : Math.round(triggerBounds.bottom + gap),
      bottom: openAbove
        ? Math.round(window.innerHeight - triggerBounds.top + gap)
        : undefined,
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.floor(availableHeight),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    positionPanel();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [isOpen, positionPanel]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>("a, button:not([disabled])")
        ?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!session?.user) return null;

  const panel =
    isOpen && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            id={panelId}
            ref={menuRef}
            className={`${styles.panel} ov-glass`}
            style={panelStyle}
            data-testid="account-menu-panel"
          >
            <p className={styles.email}>{session.user.email}</p>
            <Link
              className={styles.item}
              href="/account"
              onClick={() => setIsOpen(false)}
            >
              My account
            </Link>
            <Link
              className={styles.item}
              href={"/account/settings" as Route}
              onClick={() => setIsOpen(false)}
            >
              Settings
            </Link>
            <button
              type="button"
              className={styles.item}
              onClick={signOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
            {errorMessage ? (
              <p role="alert" className={styles.error}>
                {errorMessage}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${triggerClassName} ${styles.trigger}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          if (!isOpen) positionPanel();
          setIsOpen((open) => !open);
        }}
      >
        Account
        <svg
          className={styles.chevron}
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m2.5 4.5 3.5 3.5 3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {panel}
    </div>
  );
}
