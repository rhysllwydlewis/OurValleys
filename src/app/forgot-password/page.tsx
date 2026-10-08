import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isRegistrationOpen } from "@/lib/email";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("auth.forgot.metaTitle"),
    description: t("auth.forgot.metaDescription"),
  };
}

export default async function ForgotPasswordPage() {
  const { t, locale } = await getTranslator();
  return (
    <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
      <section className={styles.card} aria-labelledby="forgot-title">
        <Link
          className={styles.brand}
          href="/"
          aria-label={t("auth.brandAria")}
        >
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>{t("auth.forgot.eyebrow")}</p>
        <h1 id="forgot-title">{t("auth.forgot.title")}</h1>
        {isRegistrationOpen() ? (
          <>
            <p className={styles.lead}>{t("auth.forgot.lead")}</p>
            <ForgotPasswordForm idPrefix="forgot-page" />
          </>
        ) : (
          <p className={styles.lead}>{t("auth.forgot.closed")}</p>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/login">
            {t("auth.forgot.back")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
