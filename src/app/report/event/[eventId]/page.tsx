import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicEvent } from "@/modules/events/public";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report an event",
  robots: { index: false, follow: false },
};

export default async function ReportEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const parsed = z.uuid().safeParse(eventId);
  if (!parsed.success) notFound();

  const result = await getPublicEvent(parsed.data);
  if (result.state !== "found") notFound();

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href="/events">
            <span aria-hidden="true">← </span>
            All local events
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">Report an event</p>
          <h1 id="report-title">{result.event.title}</h1>
          <p className="lead">
            Tell us what needs correcting. Reports go to an OurValleys reviewer
            and never change the listing automatically.
          </p>
          <ReportForm eventId={result.event.id} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
