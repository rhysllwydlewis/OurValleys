import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  AuthShell,
  authShellStyles as styles,
} from "@/components/auth/auth-shell";

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
  const { t, locale } = await getTranslator();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const isInvalidLink = !token || params.error === "INVALID_TOKEN";

  return (
    <AuthShell
      idPrefix="reset"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("auth.brandAria")}
      eyebrow={t("auth.forgot.eyebrow")}
      title={t("auth.reset.title")}
      lead={isInvalidLink ? undefined : t("auth.reset.lead")}
      actions={
        <>
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
        </>
      }
    >
      {isInvalidLink ? (
        <p className={styles.notice} role="note">
          {t("auth.reset.invalid")}
        </p>
      ) : (
        <ResetPasswordForm idPrefix="reset-page" token={token} />
      )}
    </AuthShell>
  );
}
