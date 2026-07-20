"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { authClient } from "@/lib/auth-client";
import { publicDemoAccount, publicDemoNotice } from "@/lib/demo-account";
import styles from "./home.module.css";

function ValleyMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 17 8.5 7.5l4 6 3-5 5.5 8.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 19.5h13"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

const menuLinks = [
  { href: "#discover", label: "Explore" },
  { href: "/businesses", label: "Businesses", isRoute: true },
  { href: "#events", label: "Events" },
  { href: "#guides", label: "Guides" },
  { href: "#for-business", label: "For business" },
] as const;

export function HomeHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const previousBodyOverflowRef = useRef("");
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isMenuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target)) return;
      if (menuButtonRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isMenuOpen]);

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    previousBodyOverflowRef.current = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    window.setTimeout(() => {
      dialog.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
    }, 0);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClosed() {
    document.documentElement.style.overflow = previousBodyOverflowRef.current;
    setDialogVersion((version) => version + 1);
    triggerRef.current?.focus();
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            className={`${styles.brand} brand`}
            href="/"
            aria-label="OurValleys home"
          >
            <ValleyMark />
            <span className={styles.brandName}>
              Our<em>Valleys</em>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Primary navigation">
            <a href="#discover">Explore</a>
            <Link href="/businesses">Businesses</Link>
            <a href="#events">Events</a>
            <a href="#guides">Guides</a>
            <a href="#for-business">For business</a>
          </nav>

          <div className={styles.headerActions}>
            <button
              ref={menuButtonRef}
              className={styles.menuButton}
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="home-mobile-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="sr-only">
                {isMenuOpen ? "Close menu" : "Open menu"}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                {isMenuOpen ? (
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
            {session?.user ? (
              <Link className={styles.signInButton} href="/account">
                Account
              </Link>
            ) : (
              <Link
                ref={triggerRef}
                className={styles.signInButton}
                href="/login?next=/account"
                onClick={(event) => {
                  if (isPending) return;
                  event.preventDefault();
                  openDialog();
                }}
                aria-haspopup="dialog"
              >
                Sign in
              </Link>
            )}
            <a className={styles.listButton} href="#for-business">
              List your business
            </a>
          </div>
        </div>

        <div
          ref={menuRef}
          id="home-mobile-menu"
          className={styles.mobileMenu}
          hidden={!isMenuOpen}
        >
          <nav aria-label="Site menu">
            {menuLinks.map((link) =>
              "isRoute" in link && link.isRoute ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>
      </header>

      {!session?.user ? (
        <dialog
          ref={dialogRef}
          className={styles.loginDialog}
          aria-labelledby="login-dialog-title"
          onClose={handleDialogClosed}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div className={styles.dialogCard}>
            <button
              className={styles.dialogClose}
              type="button"
              onClick={closeDialog}
              aria-label="Close sign-in dialog"
            >
              ×
            </button>
            <p className={styles.eyebrow}>Your local account</p>
            <h2 id="login-dialog-title" className={styles.dialogTitle}>
              Sign in to OurValleys
            </h2>
            <p className={styles.dialogLead}>
              Access your account and protected business tools. Browsing and
              public search remain available without signing in.
            </p>
            <SignInForm
              key={dialogVersion}
              idPrefix="home-sign-in"
              returnTo="/account"
              onSuccess={closeDialog}
              publicDemo={{
                email: publicDemoAccount.email,
                password: publicDemoAccount.password,
                notice: publicDemoNotice,
              }}
            />
            <div className={styles.dialogActions}>
              <Link href="/login?next=/account">Open full sign-in page</Link>
              <button type="button" onClick={closeDialog}>
                Continue browsing
              </button>
            </div>
            <p className={styles.dialogNote}>
              Public registration remains a separate verified journey. The
              disclosed demonstration account can only view one fictional
              business dashboard.
            </p>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
