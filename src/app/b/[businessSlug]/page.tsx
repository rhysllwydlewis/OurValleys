import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BusinessPageView } from "@/components/business-activity";
import { BusinessOperationsSections } from "@/components/business-operations-sections";
import { GeneratedBusinessWebsite } from "@/components/generated-business-website";
import { SavedBusinessControl } from "@/components/saved-business-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  getPublicBusinessOperations,
  resolvePublishedBusinessRedirect,
} from "@/modules/businesses/public-operations";
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
  searchParams,
}: {
  params: BusinessPageParams;
  searchParams: Promise<{ source?: string }>;
}) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);

  if (result.state === "missing") {
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}`);
    notFound();
  }

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
  const [appearance, media, operations] = await Promise.all([
    getBusinessAppearance(business.id),
    listBusinessMedia(business.id),
    getPublicBusinessOperations(business.id),
  ]);
  const projection = projectPublishedBusinessSite(business);
  const updatedLabel = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(business.updatedAt);
  const primaryContact =
    operations.contacts.find((contact) => contact.isPrimary) ??
    operations.contacts[0];
  const primaryAction = primaryContact
    ? {
        label: primaryContact.label,
        href: primaryContact.formKind
          ? `/b/${business.slug}/contact?kind=${primaryContact.formKind}`
          : primaryContact.href!,
      }
    : null;
  const additionalSections = [
    ...(operations.contacts.length > 0
      ? [{ id: "contact", label: "Contact" }]
      : []),
    ...(operations.offers.length > 0
      ? [{ id: "offers", label: "Offers" }]
      : []),
    ...(operations.events.length > 0
      ? [{ id: "events", label: "Events" }]
      : []),
    ...(operations.menu.length > 0 || operations.menuDocument?.url
      ? [{ id: "menu", label: "Menu" }]
      : []),
    ...operations.categorySections.map((section) => ({
      id: `feature-${section.id}`,
      label: section.title,
    })),
  ];
  const { source } = await searchParams;

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
      primaryActionOverride={primaryAction}
      additionalSections={additionalSections}
      additionalContent={
        <>
          <BusinessPageView
            businessId={business.id}
            source={source === "qr" ? "qr" : "direct"}
          />
          {source === "qr" ? (
            <BusinessPageView
              businessId={business.id}
              source="qr"
              eventType="qr_visit"
            />
          ) : null}
          <SavedBusinessControl
            businessId={business.id}
            returnTo={`/b/${business.slug}`}
          />
          <BusinessOperationsSections
            businessId={business.id}
            businessSlug={business.slug}
            businessName={business.tradingName}
            operations={operations}
          />
        </>
      }
    />
  );
}
