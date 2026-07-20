import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBusinessIdentityById } from "@/modules/businesses/public";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report incorrect information | OurValleys",
  robots: { index: false, follow: false },
};

export default async function ReportBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const parsed = z.uuid().safeParse(businessId);
  if (!parsed.success) notFound();

  const identity = await getBusinessIdentityById(parsed.data);
  if (!identity) notFound();

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
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">Report incorrect information</p>
          <h1 id="report-title">{identity.tradingName}</h1>
          <p className="lead">
            Tell us what needs correcting. Reports go to an OurValleys reviewer
            and never change the listing automatically.
          </p>
          <ReportForm businessId={identity.id} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
