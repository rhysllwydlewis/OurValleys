"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/auth/account-menu";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteNavLinks } from "@/components/site-nav";
import { authClient } from "@/lib/auth-client";
import { publicDemoAccount } from "@/lib/demo-account";
import { useLocale } from "@/lib/i18n/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
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
  const { t, locale } = useLocale();
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
      <a className="skip-link" href="#main-content">
        {t("common.skipToContent")}
      </a>
      <header className={styles.header} lang={LOCALE_DETAILS[locale].htmlLang}>
        <div className={styles.headerInner}>
          <Link
            className={`${styles.brand} brand`}
            href="/"
            aria-label={t("brand.home")}
          >
            <ValleyMark />
            <span className={styles.brandName}>
              Our<em>Valleys</em>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label={t("nav.primary")}>
            <SiteNavLinks />
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.headerSwitcher}>
              <LanguageSwitcher />
            </div>
            <button
              ref={menuButtonRef}
              className={styles.menuButton}
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="home-mobile-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="sr-only">
                {isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
              <AccountMenu triggerClassName={styles.signInButton} />
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
                {t("header.signIn")}
              </Link>
            )}
            <a className={styles.listButton} href="#for-business">
              {t("header.listBusiness")}
            </a>
          </div>
        </div>

        <div
          ref={menuRef}
          id="home-mobile-menu"
          className={styles.mobileMenu}
          hidden={!isMenuOpen}
        >
          <nav
            aria-label={t("nav.siteMenu")}
            onClick={(event) => {
              if (event.target instanceof HTMLAnchorElement) {
                setIsMenuOpen(false);
              }
            }}
          >
            <SiteNavLinks />
          </nav>
          <div className={styles.menuSwitcher}>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <span id="main-content" tabIndex={-1} />

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
              aria-label={t("dialog.close")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m7 7 10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <p className={styles.eyebrow}>{t("dialog.eyebrow")}</p>
            <h2 id="login-dialog-title" className={styles.dialogTitle}>
              {t("dialog.title")}
            </h2>
            <p className={styles.dialogLead}>{t("dialog.lead")}</p>
            <SignInForm
              key={dialogVersion}
              idPrefix="home-sign-in"
              returnTo="/account"
              onSuccess={closeDialog}
              publicDemos={[publicDemoAccount]}
            />
            <div className={styles.dialogActions}>
              <Link href="/login?next=/account">{t("dialog.fullPage")}</Link>
              <button type="button" onClick={closeDialog}>
                {t("dialog.continueBrowsing")}
              </button>
            </div>
            <p className={styles.dialogNote}>{t("dialog.note")}</p>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
