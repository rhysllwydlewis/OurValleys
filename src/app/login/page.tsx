import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSafeAuthReturnPath } from "@/lib/auth-return-path";
import { getAuth } from "@/lib/auth";
import { publicDemoAccounts } from "@/lib/demo-account";
import { isRegistrationOpen } from "@/lib/email";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your OurValleys account, or explore a public development demonstration of the viewer, business-owner and administration journeys.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const returnTo = getSafeAuthReturnPath((await searchParams).next);
  const session = await readSession();

  if (session) redirect(returnTo as Route);

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-title">
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Secure account access</p>
        <h1 id="login-title">Sign in to OurValleys.</h1>
        <p className={styles.lead}>
          Use an existing account, or choose one of the clearly labelled public
          development demonstrations below to explore viewer, business-owner and
          administration journeys.
        </p>
        <SignInForm
          idPrefix="login-page"
          returnTo={returnTo}
          autoFocus
          publicDemos={publicDemoAccounts}
        />
        {isRegistrationOpen() ? (
          <p className={styles.notice} role="note">
            New here? <Link href="/register">Create your free account</Link>.
            Forgotten your password?{" "}
            <Link href="/forgot-password">Reset it here</Link>. Public discovery
            does not require an account.
          </p>
        ) : (
          <p className={styles.notice} role="note">
            Public discovery does not require an account. New account
            registration and password recovery open automatically once
            verification emails can be delivered.
          </p>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/businesses">
            Search local businesses
          </Link>
          <Link className={styles.secondary} href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
