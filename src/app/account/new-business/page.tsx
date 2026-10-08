import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";
import styles from "../account.module.css";
import { NewBusinessForm } from "./new-business-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("newBusiness.metaTitle") };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function NewBusinessPage() {
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/account/new-business");

  const isDemoAccount = isPublicDemoEmail(session.user.email);
  const [categories, places] = await Promise.all([
    listActiveCategories(),
    listActivePlaces(),
  ]);
  const referenceDataReady = categories.length > 0 && places.length > 0;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
        <div>
          <p className={styles.eyebrow}>{t("newBusiness.eyebrow")}</p>
          <h1>{t("newBusiness.title")}</h1>
          <p className={styles.lead}>{t("newBusiness.lead")}</p>
        </div>

        {isDemoAccount ? (
          <section className={styles.stateCard} role="note">
            <p className={styles.eyebrow}>{t("newBusiness.demo.eyebrow")}</p>
            <h2>{t("newBusiness.demo.title")}</h2>
            <p>{t("newBusiness.demo.body")}</p>
            <p>
              <Link href="/register">{t("newBusiness.demo.cta")}</Link>
            </p>
          </section>
        ) : referenceDataReady ? (
          <NewBusinessForm categories={categories} places={places} />
        ) : (
          <section className={styles.stateCard} role="note">
            <p className={styles.eyebrow}>
              {t("newBusiness.unavailable.eyebrow")}
            </p>
            <h2>{t("newBusiness.unavailable.title")}</h2>
            <p>{t("newBusiness.unavailable.body")}</p>
            <p>
              <Link href="/account">{t("newBusiness.unavailable.return")}</Link>
            </p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
