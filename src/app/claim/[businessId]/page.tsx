import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { submitClaimAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Claim a business",
  robots: { index: false, follow: false },
};

export default async function ClaimBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success) notFound();
  let row: { tradingName: string; slug: string } | undefined;
  try {
    const database = getDatabase();
    [row] = await database
      .select({ tradingName: business.tradingName, slug: business.slug })
      .from(business)
      .where(and(eq(business.id, businessId), eq(business.status, "published")))
      .limit(1);
  } catch {
    row = undefined;
  }
  if (!row) notFound();
  const { outcome } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/b/${row.slug}`}>← Back to {row.tradingName}</Link>
        </nav>
        <section className="state-panel">
          <p className="eyebrow">Ownership claim</p>
          <h1>Request access to {row.tradingName}</h1>
          <p>
            Formal proof is not mandatory to start a claim. Give the review team
            enough accurate information to distinguish a genuine connection from
            impersonation or a duplicate. Submitting a claim never removes an existing
            owner automatically.
          </p>
          {outcome === "submitted" ? (
            <div role="status">
              <h2>Your claim has been submitted.</h2>
              <p>
                An administrator will review the account, business record and evidence.
                High-impact actions remain confirmed and audited.
              </p>
            </div>
          ) : (
            <form action={submitClaimAction}>
              <input type="hidden" name="businessId" value={businessId} />
              <div className="field">
                <label htmlFor="claim-role">Your connection to the business</label>
                <select id="claim-role" name="role" required defaultValue="owner">
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Member of staff</option>
                  <option value="representative">Authorised representative</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="claim-reason">Why should this account receive access?</label>
                <textarea id="claim-reason" name="reason" minLength={10} maxLength={2000} required />
              </div>
              <div className="field">
                <label htmlFor="claim-website">Existing website or public profile (optional)</label>
                <input id="claim-website" name="website" type="url" maxLength={1000} />
              </div>
              <div className="field">
                <label htmlFor="claim-phone">Business telephone number (optional)</label>
                <input id="claim-phone" name="phone" type="tel" maxLength={30} />
              </div>
              <div className="field">
                <label htmlFor="claim-evidence">Other evidence or differences to note (optional)</label>
                <textarea id="claim-evidence" name="evidenceNote" maxLength={2000} />
              </div>
              {outcome === "verify-email" ? (
                <p className="field-error" role="alert">
                  Verify your account email before submitting an ownership claim.
                </p>
              ) : outcome ? (
                <p className="field-error" role="alert">
                  The claim could not be submitted. Check the details and try again.
                </p>
              ) : null}
              <button className="button primary" type="submit">
                Submit ownership claim
              </button>
            </form>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
