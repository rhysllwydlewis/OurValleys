import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuth } from "@/lib/auth";
import {
  getSafeAuthReturnPath,
  withAuthReturnPath,
} from "@/lib/auth-return-path";
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
    title: t("auth.register.metaTitle"),
    description: t("auth.register.metaDescription"),
  };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

type RegisterPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { next } = await searchParams;
  const { t, locale } = await getTranslator();
  const session = await readSession();
  // A signed-in visitor carries on to where they were heading, as on /login.
  if (session) redirect(getSafeAuthReturnPath(next) as Route);

  const registrationOpen = isRegistrationOpen();

  return (
    <AuthShell
      idPrefix="register"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("auth.brandAria")}
      eyebrow={t("auth.register.eyebrow")}
      title={t("auth.register.title")}
      lead={
        registrationOpen
          ? t("auth.register.lead")
          : t("auth.register.closedLead")
      }
      actions={
        <>
          <Link
            className={styles.primary}
            href={withAuthReturnPath("/login", next) as Route}
          >
            {t("auth.register.signInInstead")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </>
      }
    >
      {registrationOpen ? (
        <>
          <RegisterForm idPrefix="register-page" />
          <p className={styles.notice} role="note">
            {t("auth.register.verifyNote")}
          </p>
        </>
      ) : (
        <p className={styles.notice} role="note">
          {t("auth.login.noAccountNeeded")}
        </p>
      )}
    </AuthShell>
  );
}
