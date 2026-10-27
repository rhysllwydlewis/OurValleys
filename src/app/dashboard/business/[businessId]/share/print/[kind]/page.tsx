import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { QrCode } from "@/components/qr-code";
import { getAuth } from "@/lib/auth";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { translatorFor } from "@/lib/i18n/translate";
import { getSiteUrl } from "@/lib/site";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  parsePrintKind,
  parsePrintLocale,
  shareUrl,
  type PrintKind,
} from "@/modules/businesses/share-kit-model";
import { PrintButton } from "./print-button";
import styles from "./print.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ businessId: string; kind: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("share.metaTitle"),
    robots: { index: false, follow: false },
  };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

/** The paper size of each sheet; the one place a printed size is chosen. */
const pageSizes: Record<PrintKind, string> = {
  poster: "A4 portrait",
  window: "A5 portrait",
  table: "A4 portrait",
  cards: "A4 portrait",
};

export default async function PrintSheetPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId, kind: rawKind } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  const kind = parsePrintKind(rawKind);
  if (!parsedBusinessId.success || !kind) notFound();
  const id = parsedBusinessId.data;

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const memberships = await listAccessibleBusinesses(session.user.id).catch(
    () => [],
  );
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();
  // A sheet for a page that is not live would print a code that goes nowhere.
  const result = await getPublishedBusinessBySlug(summary.slug);
  if (result.state !== "ready") notFound();
  const { business } = result;

  const sheetLocale = parsePrintLocale((await searchParams).lang);
  const s = translatorFor(sheetLocale);
  const sheetLang = LOCALE_DETAILS[sheetLocale].htmlLang;
  const appearance = await getBusinessAppearance(business.id);
  const accent = getAccent(appearance.accentKey);
  const url = shareUrl(getSiteUrl(), business.slug, "print");
  const qrLabel = s("share.sheet.qrAlt", { business: business.tradingName });
  const sheetName = t(`share.print.${kind}.name`);

  const qr = <QrCode className={styles.qr} value={url} label={qrLabel} />;
  const displayUrl = `${getSiteUrl().host}/b/${business.slug}`;
  const copies = kind === "cards" ? 8 : kind === "table" ? 2 : 1;

  return (
    <main
      className={styles.root}
      style={
        {
          "--sheet-accent": accent.primary,
          "--sheet-strong": accent.strong,
          "--sheet-soft": accent.soft,
        } as React.CSSProperties
      }
    >
      {/* Static, trusted text: the paper size for this sheet only. */}
      <style>{`@page { size: ${pageSizes[kind]}; margin: 0; }`}</style>
      <div className={styles.toolbar}>
        <Link href={`/dashboard/business/${id}/share` as Route}>
          <span aria-hidden="true">← </span>
          {t("share.sheet.back")}
        </Link>
        <PrintButton label={t("share.sheet.print")} />
        <p>{t("share.sheet.hint")}</p>
      </div>
      <div
        className={styles.paper}
        data-kind={kind}
        lang={sheetLang}
        aria-label={sheetName}
        role="group"
      >
        {Array.from({ length: copies }, (_, index) => (
          <article key={index} className={styles.card} data-kind={kind}>
            {kind === "cards" ? (
              <>
                <div className={styles.cardText}>
                  <p className={styles.cardName}>{business.tradingName}</p>
                  <p className={styles.cardPlace}>
                    {business.category.name} · {business.place.name}
                  </p>
                  <p className={styles.cardUrl}>{displayUrl}</p>
                </div>
                {qr}
              </>
            ) : (
              <>
                <p className={styles.kicker}>
                  {business.category.name} · {business.place.name}
                </p>
                {index === 0 ? (
                  <h1 className={styles.name}>{business.tradingName}</h1>
                ) : (
                  <p className={styles.name}>{business.tradingName}</p>
                )}
                <p className={styles.find}>{s("share.sheet.find")}</p>
                {qr}
                <p className={styles.scan}>{s("share.sheet.scan")}</p>
                <p className={styles.url}>{displayUrl}</p>
                <p className={styles.search}>
                  {s("share.sheet.search", { business: business.tradingName })}
                </p>
                <p className={styles.local}>{s("share.sheet.local")}</p>
              </>
            )}
            {kind === "table" && index === 0 ? (
              <span className={styles.cutLine} aria-hidden="true" />
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
