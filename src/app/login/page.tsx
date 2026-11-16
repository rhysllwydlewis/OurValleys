import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoCodeForm } from "@/components/auth/demo-code-form";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  getPostSignInPath,
  getSafeAuthReturnPath,
  withAuthReturnPath,
} from "@/lib/auth-return-path";
import { getAuth } from "@/lib/auth";
import {
  publicDemoAccount,
  publicDemoAccounts,
  type PublicDemoAccount,
} from "@/lib/demo-account";
import { isRegistrationOpen } from "@/lib/email";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { readDemoAccess } from "@/lib/demo-access-server";
import { shouldExposePrivilegedPublicDemos } from "@/lib/release-stage";
import {
  AuthShell,
  authShellStyles as styles,
} from "@/components/auth/auth-shell";

import {
  lockDemoAccessAction,
  unlockDemoAccessAction,
} from "./demo-access-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("auth.login.metaTitle"),
    description: t("auth.login.metaDescription"),
  };
}

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    demo?: string | string[];
  }>;
};

const demoOutcomes = ["wrong", "wait", "unlocked"] as const;

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { t, locale } = await getTranslator();
  const query = await searchParams;
  const next = query.next;
  const returnTo = getSafeAuthReturnPath(next);
  const session = await readSession();

  if (session) {
    redirect(getPostSignInPath(next, session.user.role) as Route);
  }

  // Demo accounts are shown to everyone, to nobody, or only to a device
  // that has entered the owner's demo code (see src/lib/demo-access.ts).
  const demoAccess = await readDemoAccess();
  const demosHidden = !demoAccess.shown;
  const demoOutcome =
    demoOutcomes.find((outcome) => outcome === query.demo) ?? null;
  const exposePrivilegedDemos =
    !demosHidden && shouldExposePrivilegedPublicDemos();
  const publicDemos: readonly PublicDemoAccount[] = demosHidden
    ? []
    : exposePrivilegedDemos
      ? publicDemoAccounts
      : [publicDemoAccount];

  const registrationOpen = isRegistrationOpen();

  return (
    <AuthShell
      idPrefix="login"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("auth.brandAria")}
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.login.title")}
      lead={
        exposePrivilegedDemos ? t("auth.login.leadDemo") : t("auth.login.lead")
      }
      panelTitle={t("signin.panelTitle")}
      panelLead={t("signin.panelLead")}
      highlights={{
        label: t("signin.benefitsAria"),
        items: [
          {
            icon: "save",
            title: t("signin.benefit1Title"),
            text: t("signin.benefit1Text"),
          },
          {
            icon: "follow",
            title: t("signin.benefit2Title"),
            text: t("signin.benefit2Text"),
          },
          {
            icon: "business",
            title: t("signin.benefit3Title"),
            text: t("signin.benefit3Text"),
          },
        ],
      }}
      actions={
        <>
          <Link className={styles.primary} href="/businesses">
            {t("auth.login.searchBusinesses")}
          </Link>
          <Link className={styles.secondary} href="/">
            {t("auth.returnHome")}
          </Link>
        </>
      }
    >
      <SignInForm
        idPrefix="login-page"
        returnTo={returnTo}
        autoFocus
        publicDemos={publicDemos}
        forgotHref={
          registrationOpen
            ? withAuthReturnPath("/forgot-password", next)
            : undefined
        }
      />
      {demoAccess.mode === "code" ? (
        <DemoCodeForm
          t={t}
          shown={demoAccess.shown}
          outcome={demoOutcome}
          next={typeof next === "string" ? next : ""}
          unlockAction={unlockDemoAccessAction}
          lockAction={lockDemoAccessAction}
        />
      ) : null}
      {registrationOpen ? (
        <div className={styles.join}>
          <p>{t("auth.login.newHere")}</p>
          <Link href={withAuthReturnPath("/register", next) as Route}>
            {t("auth.login.createLink")}
          </Link>
        </div>
      ) : null}
      <p className={styles.footnote} role="note">
        {registrationOpen
          ? t("auth.login.noAccountNeeded")
          : t("auth.login.registrationClosed")}
      </p>
    </AuthShell>
  );
}
