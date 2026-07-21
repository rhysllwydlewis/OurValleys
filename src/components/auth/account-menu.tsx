"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-menu.module.css";
import { useSignOut } from "./use-sign-out";

type AccountMenuProps = {
  triggerClassName: string | undefined;
};

/**
 * Renders nothing when signed out — callers already have their own signed-out
 * affordance (a plain sign-in link, or the homepage's inline sign-in dialog
 * trigger) and shouldn't lose that by delegating to a shared default here.
 */
export function AccountMenu({ triggerClassName }: AccountMenuProps) {
  const { data: session } = authClient.useSession();
  const { signOut, isSigningOut, errorMessage } = useSignOut();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

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
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  if (!session?.user) return null;

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${triggerClassName} ${styles.trigger}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
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
      {isOpen ? (
        <div id={panelId} ref={menuRef} className={`${styles.panel} ov-glass`}>
          <p className={styles.email}>{session.user.email}</p>
          <Link
            className={styles.item}
            href="/account"
            onClick={() => setIsOpen(false)}
          >
            My account
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
        </div>
      ) : null}
    </div>
  );
}
