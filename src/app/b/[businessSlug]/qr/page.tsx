import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  const imageUrl = `/b/${result.business.slug}/qr/image`;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/b/${result.business.slug}`}>
            ← Back to {result.business.tradingName}
          </Link>
        </nav>
        <section className="state-panel" aria-labelledby="qr-title">
          <p className="eyebrow">Stable sharing asset</p>
          <h1 id="qr-title">QR code for {result.business.tradingName}</h1>
          <p>
            Use this code on menus, shop windows, flyers, business cards and social
            posts. Approved address changes keep old links working through permanent
            redirects.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`QR code linking to ${result.business.tradingName} on OurValleys`}
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
      <SiteFooter />
    </>
  );
}
