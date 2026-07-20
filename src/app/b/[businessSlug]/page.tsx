import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";

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
  const updatedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(business.updatedAt);
  const visualWords = business.tradingName
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .slice(0, 2);
  const joinsWithAmpersand = business.tradingName.includes("&");

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href="/businesses">
            <span aria-hidden="true">← </span>
            All local businesses
          </Link>
        </nav>

        {business.isDemo ? (
          <div className="demo-banner" role="note">
            <strong>Fictional demonstration business.</strong>
            <span>
              This is test content for the OurValleys build, not a real company
              or public listing.
            </span>
          </div>
        ) : null}

        <section className="business-hero" aria-labelledby="business-title">
          <div className="business-hero__copy">
            <div className="tag-row">
              <span className="tag">{business.category.name}</span>
              <span className="tag tag--quiet">{business.place.name}</span>
            </div>
            <p className="eyebrow">Independent local profile</p>
            <h1 id="business-title">{business.tradingName}</h1>
            <p className="lead">{business.summary}</p>
            <div className="actions">
              {business.publicEmail ? (
                <a
                  className="button primary"
                  href={`mailto:${business.publicEmail}`}
                >
                  Email this business
                </a>
              ) : null}
              {business.publicPhone ? (
                <a className="button" href={`tel:${business.publicPhone}`}>
                  Call this business
                </a>
              ) : null}
            </div>
            <p className="trust-note">
              {business.verificationStatus === "verified"
                ? "Selected details have been verified by OurValleys."
                : "This profile has not been independently verified. Public information is shown as supplied or demonstrated."}
            </p>
          </div>
          <div className="business-hero__visual" aria-hidden="true">
            <span>{visualWords[0] ?? business.tradingName}</span>
            {visualWords.length > 1 ? (
              <>
                {joinsWithAmpersand ? <strong>&</strong> : null}
                <span>{visualWords[1]}</span>
              </>
            ) : null}
          </div>
        </section>

        <section className="business-section split-section" id="about">
          <div>
            <p className="eyebrow">About</p>
            <h2>A useful local page from one trusted record.</h2>
          </div>
          <p className="body-copy">{business.description}</p>
        </section>

        <section className="business-section" id="services">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services</p>
              <h2>Ways this business can help.</h2>
            </div>
            <p>Price guidance is never invented.</p>
          </div>
          {business.services.length > 0 ? (
            <div className="service-grid">
              {business.services.map((service) => (
                <article className="service-card" key={service.id}>
                  <span className="service-card__number" aria-hidden="true">
                    {String(
                      business.services.findIndex(
                        (item) => item.id === service.id,
                      ) + 1,
                    ).padStart(2, "0")}
                  </span>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <strong>
                    {service.priceDisplay ?? "Contact for details"}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="inline-empty">Services have not been added yet.</p>
          )}
        </section>

        <section className="business-section details-grid">
          <div className="detail-panel">
            <p className="eyebrow">Location</p>
            <h2>Serving the local area.</h2>
            <p>{business.location.display}</p>
            <small>
              Exact private addresses remain hidden unless a business chooses to
              publish a public premises address.
            </small>
          </div>
          <div className="detail-panel">
            <p className="eyebrow">Opening hours</p>
            <h2>When to get in touch.</h2>
            {business.openingHours.length > 0 ? (
              <dl className="hours-list">
                {business.openingHours.map((hour) => (
                  <div key={hour.day}>
                    <dt>{hour.day}</dt>
                    <dd>{hour.display}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Opening hours have not been supplied.</p>
            )}
          </div>
        </section>

        <section className="business-section disclosure-panel">
          <div>
            <p className="eyebrow">Profile information</p>
            <h2>Transparent by design.</h2>
          </div>
          <dl className="compact-facts">
            <div>
              <dt>Last updated</dt>
              <dd>{updatedDate}</dd>
            </div>
            <div>
              <dt>Platform relationship</dt>
              <dd>Hosted and discoverable through OurValleys</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>
                {business.verificationStatus === "verified"
                  ? "Verified details available"
                  : "Not independently verified"}
              </dd>
            </div>
          </dl>
          <a
            className="text-link"
            href={`mailto:corrections@ourvalleys.example?subject=Information correction: ${encodeURIComponent(
              business.tradingName,
            )}`}
          >
            Report incorrect information
            <span aria-hidden="true"> →</span>
          </a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
