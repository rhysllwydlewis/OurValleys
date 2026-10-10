import type { Metadata } from "next";
import { headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessInvitation } from "@/lib/database/schema/business-governance";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { acceptInvitationAction } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("invite.metaTitle"),
    robots: { index: false, follow: false },
  };
}

const roleKeys: Record<string, MessageKey> = {
  manager: "invite.role.manager",
  editor: "invite.role.editor",
  viewer: "invite.role.viewer",
};

const outcomeKeys: Record<string, MessageKey> = {
  email_mismatch: "invite.outcome.email_mismatch",
  expired: "invite.outcome.expired",
  not_found: "invite.outcome.not_found",
  unavailable: "invite.outcome.unavailable",
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
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const outcomeKey = outcome ? outcomeKeys[outcome] : undefined;

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
        <main className="business-site-shell" lang={lang}>
          <section className="state-panel">
            <p className="eyebrow">{t("invite.eyebrow")}</p>
            <h1>{t("invite.goneTitle")}</h1>
            <p>{outcomeKey ? t(outcomeKey) : t("invite.goneBody")}</p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const roleKey = roleKeys[invitation.role];
  const roleLabel = roleKey ? t(roleKey) : invitation.role;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <section className="state-panel">
          <p className="eyebrow">{t("invite.eyebrow")}</p>
          <h1>
            {t("invite.joinTitle", {
              business: invitation.businessName,
              role: roleLabel,
            })}
          </h1>
          <p>
            {t("invite.joinBody", {
              email: invitation.email,
              role: roleLabel,
            })}
          </p>
          {outcomeKey ? (
            <p className="field-error" role="alert">
              {t(outcomeKey)}
            </p>
          ) : null}
          {session ? (
            session.user.email.trim().toLowerCase() === invitation.email ? (
              <form action={acceptInvitationAction}>
                <input type="hidden" name="token" value={token} />
                <button className="button primary" type="submit">
                  {t("invite.accept")}
                </button>
              </form>
            ) : (
              <p>
                {t("invite.wrongAccount", {
                  current: session.user.email,
                  invited: invitation.email,
                })}
              </p>
            )
          ) : (
            <form action={acceptInvitationAction}>
              <input type="hidden" name="token" value={token} />
              <button className="button primary" type="submit">
                {t("invite.signInAccept")}
              </button>
            </form>
          )}
          <p>
            <Link href="/">{t("invite.home")}</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
