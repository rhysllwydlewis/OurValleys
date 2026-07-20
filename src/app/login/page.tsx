import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSafeAuthReturnPath } from "@/lib/auth-return-path";
import { getAuth } from "@/lib/auth";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

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

  if (session) {
    redirect(returnTo);
  }

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
          Use the email address and password for an existing account. Successful
          sign-in returns you to the protected page you were trying to reach.
        </p>
        <SignInForm
          idPrefix="login-page"
          returnTo={returnTo}
          autoFocus
        />
        <p className={styles.notice} role="note">
          Public discovery does not require an account. New account registration
          and password recovery will open only with their complete verified
          journeys.
        </p>
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
