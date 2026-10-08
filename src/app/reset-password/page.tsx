import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getTranslator } from "@/lib/i18n/server";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("auth.reset.metaTitle"),
    description: t("auth.reset.metaDescription"),
  };
}

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[]; error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const isInvalidLink = !token || params.error === "INVALID_TOKEN";

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="reset-title">
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
        <h1 id="reset-title">{t("auth.reset.title")}</h1>
        {isInvalidLink ? (
          <p className={styles.lead}>{t("auth.reset.invalid")}</p>
        ) : (
          <>
            <p className={styles.lead}>{t("auth.reset.lead")}</p>
            <ResetPasswordForm idPrefix="reset-page" token={token} />
          </>
        )}
        <div className={styles.actions}>
          {isInvalidLink ? (
            <Link className={styles.primary} href="/forgot-password">
              {t("auth.reset.requestNew")}
            </Link>
          ) : (
            <Link className={styles.primary} href="/login">
              {t("auth.forgot.back")}
            </Link>
          )}
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
