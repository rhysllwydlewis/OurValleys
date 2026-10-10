import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { business } from "@/lib/database/schema/business";
import { submitClaimAction } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("claim.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ClaimBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success) notFound();
  let row: { tradingName: string; slug: string } | undefined;
  try {
    const database = getDatabase();
    [row] = await database
      .select({ tradingName: business.tradingName, slug: business.slug })
      .from(business)
      .where(and(eq(business.id, businessId), eq(business.status, "published")))
      .limit(1);
  } catch {
    row = undefined;
  }
  if (!row) notFound();
  const { outcome } = await searchParams;
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${row.slug}`}>
            {t("claim.back", { business: row.tradingName })}
          </Link>
        </nav>
        <section className="state-panel">
          <p className="eyebrow">{t("claim.eyebrow")}</p>
          <h1>{t("claim.title", { business: row.tradingName })}</h1>
          <p>{t("claim.lead")}</p>
          {outcome === "submitted" ? (
            <div role="status">
              <h2>{t("claim.submittedTitle")}</h2>
              <p>{t("claim.submittedBody")}</p>
            </div>
          ) : (
            <form action={submitClaimAction}>
              {session ? null : (
                <p className="field-hint">
                  {t("claim.signInBefore")}
                  <Link href={`/login?next=/claim/${businessId}`}>
                    {t("claim.signInLink")}
                  </Link>
                  {t("claim.signInAfter")}
                </p>
              )}
              <input type="hidden" name="businessId" value={businessId} />
              <div className="field">
                <label htmlFor="claim-role">{t("claim.role")}</label>
                <select
                  id="claim-role"
                  name="role"
                  required
                  defaultValue="owner"
                >
                  <option value="owner">{t("claim.role.owner")}</option>
                  <option value="manager">{t("claim.role.manager")}</option>
                  <option value="staff">{t("claim.role.staff")}</option>
                  <option value="representative">
                    {t("claim.role.representative")}
                  </option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="claim-reason">{t("claim.reason")}</label>
                <textarea
                  id="claim-reason"
                  name="reason"
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="claim-website">{t("claim.website")}</label>
                <input
                  id="claim-website"
                  name="website"
                  type="url"
                  maxLength={1000}
                />
              </div>
              <div className="field">
                <label htmlFor="claim-phone">{t("claim.phone")}</label>
                <input
                  id="claim-phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                />
              </div>
              <div className="field">
                <label htmlFor="claim-evidence">{t("claim.evidence")}</label>
                <textarea
                  id="claim-evidence"
                  name="evidenceNote"
                  maxLength={2000}
                />
              </div>
              {outcome === "verify-email" ? (
                <p className="field-error" role="alert">
                  {t("claim.verifyEmail")}
                </p>
              ) : outcome ? (
                <p className="field-error" role="alert">
                  {t("claim.failed")}
                </p>
              ) : null}
              <button className="button primary" type="submit">
                {t("claim.submit")}
              </button>
            </form>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
