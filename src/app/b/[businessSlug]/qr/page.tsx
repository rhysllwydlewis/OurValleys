import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  return result.state === "ready"
    ? {
        title: `QR code for ${result.business.tradingName}`,
        robots: { index: false, follow: false },
      }
    : { title: "QR code unavailable", robots: { index: false, follow: false } };
}

export default async function BusinessQrPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready") notFound();
  const { business } = result;
  const imageUrl = `/b/${business.slug}/qr/image`;
  const [media, appearance] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
  ]);
  const accent = getAccent(appearance.accentKey);
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;

  return (
    <div className="business-qr-page" style={siteStyle}>
      <BusinessSiteHeader
        tradingName={business.tradingName}
        logo={media.logo}
        sections={[]}
        primaryAction={null}
      />
      <main className="business-site-shell" id="business-content">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/b/${business.slug}`}>
            ← Back to {business.tradingName}
          </Link>
        </nav>
        <section className="state-panel" aria-labelledby="qr-title">
          <p className="eyebrow">Stable sharing asset</p>
          <h1 id="qr-title">QR code for {business.tradingName}</h1>
          <p>
            Use this code on menus, shop windows, flyers, business cards and
            social posts. Approved address changes keep old links working
            through permanent redirects.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`QR code linking to ${business.tradingName} on OurValleys`}
            width="360"
            height="360"
          />
          <div className="tag-row">
            <a className="button primary" href={imageUrl} download>
              Download SVG
            </a>
            <PrintButton />
          </div>
          <p className="field-hint">
            The QR visit count appears in the protected business analytics view.
          </p>
        </section>
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
