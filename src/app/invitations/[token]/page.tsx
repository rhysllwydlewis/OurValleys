import type { Metadata } from "next";
import { headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessInvitation } from "@/lib/database/schema/business-governance";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { acceptInvitationAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team invitation",
  robots: { index: false, follow: false },
};

const roleLabels: Record<string, string> = {
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

const outcomeMessages: Record<string, string> = {
  email_mismatch:
    "Sign in with the email address this invitation was sent to, then try again.",
  expired: "This invitation has expired. Ask the business to send a new one.",
  not_found: "This invitation is no longer valid.",
  unavailable: "That action is temporarily unavailable. Try again shortly.",
};

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { token } = await params;
  const { outcome } = await searchParams;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();

  let invitation:
    { businessName: string; role: string; email: string } | undefined;
  try {
    const database = getDatabase();
    [invitation] = await database
      .select({
        businessName: business.tradingName,
        role: businessInvitation.role,
        email: businessInvitation.email,
      })
      .from(businessInvitation)
      .innerJoin(business, eq(business.id, businessInvitation.businessId))
      .where(
        and(
          eq(businessInvitation.token, token),
          eq(businessInvitation.status, "pending"),
          gt(businessInvitation.expiresAt, new Date()),
        ),
      )
      .limit(1);
  } catch {
    invitation = undefined;
  }

  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);

  if (!invitation) {
    return (
      <>
        <SiteHeader />
        <main className="business-site-shell">
          <section className="state-panel">
            <p className="eyebrow">Team invitation</p>
            <h1>This invitation is no longer available.</h1>
            <p>
              {outcome && outcomeMessages[outcome]
                ? outcomeMessages[outcome]
                : "It may have already been used, revoked or expired."}
            </p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <section className="state-panel">
          <p className="eyebrow">Team invitation</p>
          <h1>
            Join {invitation.businessName} as a{" "}
            {roleLabels[invitation.role] ?? invitation.role}.
          </h1>
          <p>
            This invitation was sent to {invitation.email}. Accepting it gives
            your account {roleLabels[invitation.role] ?? invitation.role} access
            to manage this business on OurValleys.
          </p>
          {outcome && outcomeMessages[outcome] ? (
            <p className="field-error" role="alert">
              {outcomeMessages[outcome]}
            </p>
          ) : null}
          {session ? (
            session.user.email.trim().toLowerCase() === invitation.email ? (
              <form action={acceptInvitationAction}>
                <input type="hidden" name="token" value={token} />
                <button className="button primary" type="submit">
                  Accept invitation
                </button>
              </form>
            ) : (
              <p>
                You are signed in as {session.user.email}. Sign in with{" "}
                {invitation.email} to accept this invitation.
              </p>
            )
          ) : (
            <form action={acceptInvitationAction}>
              <input type="hidden" name="token" value={token} />
              <button className="button primary" type="submit">
                Sign in to accept
              </button>
            </form>
          )}
          <p>
            <Link href="/">Return to OurValleys</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
