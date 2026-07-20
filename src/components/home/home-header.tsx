"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { authClient } from "@/lib/auth-client";
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

export function HomeHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const { data: session, isPending } = authClient.useSession();

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    window.setTimeout(() => {
      dialog.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
    }, 0);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClosed() {
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
            <h2 id="login-dialog-title">Sign in to OurValleys</h2>
            <p>
              Access your account and protected business tools. Browsing and
              public search remain available without signing in.
            </p>
            <SignInForm
              key={dialogVersion}
              idPrefix="home-sign-in"
              returnTo="/account"
              onSuccess={closeDialog}
            />
            <div className={styles.dialogActions}>
              <Link href="/login?next=/account">Open full sign-in page</Link>
              <button type="button" onClick={closeDialog}>
                Continue browsing
              </button>
            </div>
            <p className={styles.dialogNote}>
              Use only an account already created for you. Public account
              registration remains a separate verified journey.
            </p>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
