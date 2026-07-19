"use client";

import Link from "next/link";
import { useRef } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const routeRef = useRef<HTMLAnchorElement>(null);

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    window.setTimeout(() => routeRef.current?.focus(), 0);
  }

  function closeDialog() {
    dialogRef.current?.close();
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
              ref={triggerRef}
              className={styles.signInButton}
              type="button"
              onClick={openDialog}
              aria-haspopup="dialog"
            >
              Sign in
            </button>
            <a className={styles.listButton} href="#for-business">
              List your business
            </a>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        className={styles.loginDialog}
        aria-labelledby="login-dialog-title"
        onClose={() => triggerRef.current?.focus()}
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
            Account access is being prepared. No email address or password is
            collected by this preview. Public discovery remains available
            without signing in.
          </p>
          <div className={styles.dialogActions}>
            <Link ref={routeRef} href="/login">
              View sign-in status
            </Link>
            <button type="button" onClick={closeDialog}>
              Continue browsing
            </button>
          </div>
          <p className={styles.dialogNote}>
            New here? Business onboarding and resident accounts will open in a
            later verified workstream.
          </p>
        </div>
      </dialog>
    </>
  );
}
