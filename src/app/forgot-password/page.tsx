import type { Metadata, Route } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { withAuthReturnPath } from "@/lib/auth-return-path";
import { isRegistrationOpen } from "@/lib/email";
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
    title: t("auth.forgot.metaTitle"),
    description: t("auth.forgot.metaDescription"),
  };
}

type ForgotPasswordPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { next } = await searchParams;
  const { t, locale } = await getTranslator();
  const registrationOpen = isRegistrationOpen();
  return (
    <AuthShell
      idPrefix="forgot"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("auth.brandAria")}
      eyebrow={t("auth.forgot.eyebrow")}
      title={t("auth.forgot.title")}
      lead={registrationOpen ? t("auth.forgot.lead") : undefined}
      actions={
        <>
          <Link
            className={styles.primary}
            href={withAuthReturnPath("/login", next) as Route}
          >
            {t("auth.forgot.back")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </>
      }
    >
      {registrationOpen ? (
        <ForgotPasswordForm idPrefix="forgot-page" />
      ) : (
        <p className={styles.notice} role="note">
          {t("auth.forgot.closed")}
        </p>
      )}
    </AuthShell>
  );
}
