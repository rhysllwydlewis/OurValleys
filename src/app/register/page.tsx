import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuth } from "@/lib/auth";
import { isRegistrationOpen } from "@/lib/email";
import { getTranslator } from "@/lib/i18n/server";
import styles from "../login.module.css";

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

export default async function RegisterPage() {
  const { t } = await getTranslator();
  const session = await readSession();
  if (session) redirect("/account");

  const registrationOpen = isRegistrationOpen();

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="register-title">
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
        <p className={styles.eyebrow}>{t("auth.register.eyebrow")}</p>
        <h1 id="register-title">{t("auth.register.title")}</h1>
        {registrationOpen ? (
          <>
            <p className={styles.lead}>{t("auth.register.lead")}</p>
            <RegisterForm idPrefix="register-page" />
            <p className={styles.notice} role="note">
              {t("auth.register.verifyNote")}
            </p>
          </>
        ) : (
          <>
            <p className={styles.lead}>{t("auth.register.closedLead")}</p>
            <p className={styles.notice} role="note">
              {t("auth.login.noAccountNeeded")}
            </p>
          </>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/login">
            {t("auth.register.signInInstead")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
