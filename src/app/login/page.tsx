import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSafeAuthReturnPath } from "@/lib/auth-return-path";
import { getAuth } from "@/lib/auth";
import {
  publicDemoAccount,
  publicDemoAccounts,
  type PublicDemoAccount,
} from "@/lib/demo-account";
import { isRegistrationOpen } from "@/lib/email";
import { getTranslator } from "@/lib/i18n/server";
import { shouldExposePrivilegedPublicDemos } from "@/lib/release-stage";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("auth.login.metaTitle"),
    description: t("auth.login.metaDescription"),
  };
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { t } = await getTranslator();
  const returnTo = getSafeAuthReturnPath((await searchParams).next);
  const session = await readSession();

  if (session) redirect(returnTo as Route);

  const exposePrivilegedDemos = shouldExposePrivilegedPublicDemos();
  const publicDemos: readonly PublicDemoAccount[] = exposePrivilegedDemos
    ? publicDemoAccounts
    : [publicDemoAccount];

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-title">
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
        <p className={styles.eyebrow}>{t("auth.login.eyebrow")}</p>
        <h1 id="login-title">{t("auth.login.title")}</h1>
        <p className={styles.lead}>
          {exposePrivilegedDemos
            ? t("auth.login.leadDemo")
            : t("auth.login.lead")}
        </p>
        <SignInForm
          idPrefix="login-page"
          returnTo={returnTo}
          autoFocus
          publicDemos={publicDemos}
        />
        {isRegistrationOpen() ? (
          <p className={styles.notice} role="note">
            {t("auth.login.newHere")}{" "}
            <Link href="/register">{t("auth.login.createLink")}</Link>.{" "}
            {t("auth.login.forgotten")}{" "}
            <Link href="/forgot-password">{t("auth.login.resetLink")}</Link>.{" "}
            {t("auth.login.noAccountNeeded")}
          </p>
        ) : (
          <p className={styles.notice} role="note">
            {t("auth.login.registrationClosed")}
          </p>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/businesses">
            {t("auth.login.searchBusinesses")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
