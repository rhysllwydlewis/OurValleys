import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GeneratedBusinessWebsite } from "@/components/generated-business-website";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { projectPublishedBusinessSite } from "@/modules/businesses/site-projection";

type BusinessPageParams = Promise<{ businessSlug: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: BusinessPageParams;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);

  if (result.state !== "ready") {
    return {
      title: "Business unavailable | OurValleys",
      robots: { index: false, follow: false },
    };
  }

  const media = await listBusinessMedia(result.business.id);
  return {
    title: `${result.business.tradingName} | OurValleys`,
    description: result.business.summary,
    alternates: { canonical: result.business.site.platformPath },
    robots: result.business.isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: result.business.tradingName,
      description: result.business.summary,
      type: "website",
      images: media.hero
        ? [{ url: media.hero.url, alt: media.hero.altText }]
        : undefined,
    },
    twitter: {
      card: media.hero ? "summary_large_image" : "summary",
      title: result.business.tradingName,
      description: result.business.summary,
      images: media.hero ? [media.hero.url] : undefined,
    },
  };
}

export default async function BusinessPage({
  params,
}: {
  params: BusinessPageParams;
}) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);

  if (result.state === "missing") notFound();

  if (result.state === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className="business-site-shell">
          <section className="state-panel">
            <p className="eyebrow">Temporary problem</p>
            <h1>This business page is temporarily unavailable.</h1>
            <p>
              The record has not been removed. Please return to business
              discovery or try again after the data service has recovered.
            </p>
            <Link className="button primary" href="/businesses">
              Browse businesses
            </Link>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { business } = result;
  const [appearance, media] = await Promise.all([
    getBusinessAppearance(business.id),
    listBusinessMedia(business.id),
  ]);
  const projection = projectPublishedBusinessSite(business);
  const updatedLabel = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(business.updatedAt);

  return (
    <GeneratedBusinessWebsite
      projection={projection}
      description={business.description}
      category={business.category}
      placeName={business.place.name}
      appearance={appearance}
      media={media}
      isDemo={business.isDemo}
      verificationStatus={business.verificationStatus}
      updatedLabel={updatedLabel}
      reportHref={`/report/${business.id}`}
    />
  );
}
