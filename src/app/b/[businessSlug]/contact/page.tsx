import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessSiteFooter, BusinessSiteHeader } from "@/components/business-site-chrome";
import { getBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { getPublicBusinessOperations } from "@/modules/businesses/public-operations";
import { EnquiryForm } from "./enquiry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getPublishedBusinessBySlug(businessSlug);
  return business
    ? {
        title: `Contact ${business.tradingName}`,
        description: `Send a private enquiry to ${business.tradingName}.`,
        robots: { index: false, follow: true },
      }
    : { title: "Business not found", robots: { index: false, follow: false } };
}

export default async function BusinessContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getPublishedBusinessBySlug(businessSlug);
  if (!business) notFound();
  const operations = await getPublicBusinessOperations(business.id);
  const availableKinds = operations.contacts
    .map((contact) => contact.formKind)
    .filter((kind): kind is "enquiry" | "quote" | "callback" => Boolean(kind));
  if (availableKinds.length === 0) notFound();
  const { kind } = await searchParams;
  const defaultKind = availableKinds.includes(kind as never)
    ? (kind as "enquiry" | "quote" | "callback")
    : availableKinds[0]!;
  const media = await getBusinessMedia(business.id);

  return (
    <div className="business-contact-page">
      <BusinessSiteHeader
        tradingName={business.tradingName}
        logo={media.logo}
        sections={[]}
        primaryAction={null}
      />
      <main className="business-site-shell" id="business-content">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/b/${business.slug}`}>← Back to {business.tradingName}</Link>
        </nav>
        <section className="business-section" aria-labelledby="contact-business-title">
          <p className="eyebrow">Private message</p>
          <h1 id="contact-business-title">Contact {business.tradingName}</h1>
          <p className="lead">
            Your message goes to the protected business inbox. Private contact details
            are never shown on the public website.
          </p>
          <EnquiryForm
            businessId={business.id}
            businessName={business.tradingName}
            defaultKind={defaultKind}
          />
        </section>
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
