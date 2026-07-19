import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPublishedBusinessBySlug } from "@/modules/businesses/repository";

export const dynamic = "force-dynamic";
type BusinessPageParameters = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: BusinessPageParameters }): Promise<Metadata> {
  const { slug } = await params;
  const business = await findPublishedBusinessBySlug(slug);
  if (!business) return { title: "Business not found", robots: { index: false, follow: false } };
  return { title: business.tradingName, description: business.summary };
}

export default async function BusinessPage({ params }: { params: BusinessPageParameters }) {
  const { slug } = await params;
  const business = await findPublishedBusinessBySlug(slug);
  if (!business) notFound();

  return (
    <article>
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <p className="font-semibold text-emerald-200">{business.category.name}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{business.tradingName}</h1>
          <p className="mt-5 max-w-3xl text-xl leading-8 text-emerald-50">{business.summary}</p>
          <p className="mt-6 text-sm text-emerald-200">{business.place?.name ?? "Serving Rhondda Cynon Taf"}</p>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-12">
          {business.description ? <section aria-labelledby="about-heading"><h2 id="about-heading" className="text-3xl font-bold">About</h2><p className="mt-4 whitespace-pre-line text-lg leading-8 text-slate-700">{business.description}</p></section> : null}
          {business.services.length > 0 ? (
            <section aria-labelledby="services-heading">
              <h2 id="services-heading" className="text-3xl font-bold">Services</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {business.services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold">{service.name}</h3>{service.description ? <p className="mt-2 text-slate-600">{service.description}</p> : null}{service.priceLabel ? <p className="mt-3 text-sm font-semibold text-emerald-800">{service.priceLabel}</p> : null}</article>)}
              </div>
            </section>
          ) : null}
          {(business.languages.length > 0 || business.accessibility.length > 0) ? <section aria-labelledby="access-heading"><h2 id="access-heading" className="text-3xl font-bold">Languages and accessibility</h2>{business.languages.length > 0 ? <p className="mt-4 text-slate-700">Languages: {business.languages.join(", ")}</p> : null}{business.accessibility.length > 0 ? <p className="mt-2 text-slate-700">Accessibility: {business.accessibility.join(", ")}</p> : null}</section> : null}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Contact</h2>
          <dl className="mt-4 space-y-4 text-sm">
            {business.publicAddress ? <div><dt className="font-bold">Location</dt><dd className="mt-1 text-slate-600">{business.publicAddress}</dd></div> : null}
            {business.publicPhone ? <div><dt className="font-bold">Telephone</dt><dd className="mt-1"><a className="text-emerald-800 underline" href={`tel:${business.publicPhone}`}>{business.publicPhone}</a></dd></div> : null}
            {business.publicEmail ? <div><dt className="font-bold">Email</dt><dd className="mt-1 break-words"><a className="text-emerald-800 underline" href={`mailto:${business.publicEmail}`}>{business.publicEmail}</a></dd></div> : null}
            {business.publicWebsite ? <div><dt className="font-bold">Website</dt><dd className="mt-1"><a className="text-emerald-800 underline" href={business.publicWebsite} rel="noreferrer">Visit website</a></dd></div> : null}
          </dl>
          <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">Last updated {business.updatedAt.toLocaleDateString("en-GB")}. Reported verification and paid-plan status are deliberately separate.</p>
        </aside>
      </div>
    </article>
  );
}
