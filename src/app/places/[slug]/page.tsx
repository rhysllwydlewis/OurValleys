import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getInitials } from "@/lib/initials";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const places = await listActivePlaces();
  const selectedPlace = places.find((place) => place.slug === slug);

  return {
    title: selectedPlace
      ? `${selectedPlace.name} local businesses | OurValleys`
      : "Place not found | OurValleys",
    description: selectedPlace
      ? `Discover published fictional local businesses associated with ${selectedPlace.name}.`
      : "The requested provisional place route is not available.",
    robots: { index: false, follow: false },
  };
}

export default async function PlacePage({ params }: PageProps) {
  const { slug } = await params;
  const places = await listActivePlaces();
  const selectedPlace = places.find((place) => place.slug === slug);
  if (!selectedPlace) notFound();

  const result = await listPublishedBusinesses({ place: selectedPlace.slug });

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="place-title">
          <p className="eyebrow">Explore a local area</p>
          <h1 id="place-title">{selectedPlace.name}</h1>
          <p className="lead">
            A provisional place page connected to active reference data and
            published fictional business profiles.
          </p>
          <div className="actions">
            <Link
              className="button primary"
              href={`/businesses?place=${selectedPlace.slug}` as Route}
            >
              Search in {selectedPlace.name}
            </Link>
            <Link className="button" href="/places">
              Browse all places
            </Link>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Local results are temporarily unavailable.</h2>
            <p>Please return after the data service has recovered.</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No published demonstrations yet</p>
            <h2>No fictional businesses are listed here yet.</h2>
            <p>
              The place route is ready for future published businesses, events
              and guides without inventing real local content.
            </p>
            <Link className="button primary" href="/businesses">
              Explore all businesses
            </Link>
          </section>
        ) : (
          <section aria-labelledby="place-results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Published demonstrations</p>
                <h2 id="place-results-title">
                  {result.businesses.length} local{" "}
                  {result.businesses.length === 1
                    ? "business"
                    : "businesses"}
                </h2>
              </div>
              <p>Organic results · no paid placement</p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div className="business-card__art" aria-hidden="true">
                    <span className="business-card__initials">
                      {getInitials(business.tradingName)}
                    </span>
                    <span>{business.category.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">Fictional demo</span>
                    </div>
                    <h3>{business.tradingName}</h3>
                    <p>{business.summary}</p>
                    <Link
                      className="text-link"
                      href={`/b/${business.slug}` as Route}
                    >
                      View generated website
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
